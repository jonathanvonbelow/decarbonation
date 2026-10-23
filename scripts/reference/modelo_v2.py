"""
DecarboNation — reference prototype of model v2 (annual and monthly engines).

Purpose
-------
Executable specification of the v2 equations described in the v6 instruction package
(mejora-general/files/32..50) and in the technical paper. It is NOT the production engine:
the TypeScript engine in src/sim/ is. This file exists so that:
  1. every parameter in the package has been run at least once and produces sane dynamics;
  2. Claude Code can cross-check its TypeScript port against known numbers
     (`python3 modelo_v2.py --golden` prints the golden table used in 33_arnes_completo.md);
  3. the paper's characterization results are reproducible.

Conventions
-----------
* Areas in kHa (1 kHa = 1,000 ha). Money in abstract units (u.m.). Time in years; the monthly
  engine uses dt = 1/12 with exact discretization for every relaxation variable.
* Every bounded indicator X follows   X <- X* + (X - X*) * (1 - k_X) ** dt
  with a logistic target  X* = 100 * sigmoid(l_X0 + sum of drivers), where l_X0 = logit(X_0)
  and every driver is written as a deviation from the level's starting state. Hence at t = 0
  with no policies X* = X_0 exactly: nothing moves unless the territory or the player moves it.
* Random draws come only from the `rng` argument (random.Random), mirroring makeRng in TS.

Run
---
    python3 modelo_v2.py                 # characterization tables (both games)
    python3 modelo_v2.py --golden        # golden values for the TS port (no events, seed-free)
"""
from __future__ import annotations

import json
import math
import random
import statistics
import sys
from copy import deepcopy
from pathlib import Path

# ──────────────────────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────────────────────

def sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def logit(p: float) -> float:
    p = min(max(p, 1e-4), 1 - 1e-4)
    return math.log(p / (1 - p))


def target(l0: float, drive: float) -> float:
    """Logistic target on the 0-100 scale."""
    return 100.0 * sigmoid(l0 + drive)


def relax(x: float, xs: float, k: float, dt: float) -> float:
    """Exact discretization of a first-order relaxation toward xs with annual rate k."""
    return xs + (x - xs) * (1.0 - k) ** dt


def s_low(x: float, x0: float, w: float) -> float:
    """Smooth step that is ~1 well below x0 and ~0 well above it."""
    return 1.0 / (1.0 + math.exp((x - x0) / w))


def s_high(x: float, x0: float, w: float) -> float:
    return 1.0 / (1.0 + math.exp(-(x - x0) / w))


def phi(e: float, e0: float) -> float:
    """Diminishing returns of instrument effort (0-100)."""
    return 1.0 - math.exp(-e / e0)


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Parameters (every value here is mirrored in src/sim/params.v2.ts by phase 32-46)
# ──────────────────────────────────────────────────────────────────────────────────────────────

LU = ["BNNP", "BNP", "CA", "CC", "PF", "PRG", "HUM", "RES", "ENR", "FAL"]
AG = ["CC", "CA", "PRG", "PF"]                      # agricultural reallocation pool
PRODUCTIVE = ["CC", "CA", "PRG", "PF", "ENR"]
POL = ["AS", "CR", "GS", "AGUA", "CN", "PAI", "PEA", "PIE", "FRA", "SE"]

P = {
    # population & time
    "pop0": 400_000, "pop_growth": 0.008,
    # policy efficiency (35)
    "lam": {"AS": 1.5, "CR": 2.5, "GS": 1.5, "AGUA": 2.0, "CN": 2.5, "PAI": 1.0, "PEA": 0.5, "PIE": 1.5, "FRA": 0.5, "SE": 0.5},
    "delta": {"AS": 15, "CR": 25, "GS": 12, "AGUA": 20, "CN": 25, "PAI": 8, "PEA": 10, "PIE": 10, "FRA": 6, "SE": 5},
    "eta_min": 0.35, "rho_recovery": 5.0,
    # cost at full effort, fraction of GDP per year (35/39)
    "kappa": {"AS": 0.008, "CR": 0.010, "GS": 0.006, "AGUA": 0.008, "CN": 0.012, "PAI": 0.006, "PEA": 0.003, "PIE": 0.005, "FRA": 0.002, "SE": 0.012},
    "cost_fixed_share": 0.3, "e0": 40.0,
    # land (43)
    "deforest": {"BNNP_BNP": 0.008, "BNNP_CC": 0.010, "BNNP_CA": 0.002, "CA_BNNP": 0.001, "RES_BNP": 0.04},
    "mu_ag": 0.02, "beta_rent": 1.0, "fallow_reentry": 0.25, "fallow_regen": 0.05,
    # carbon (40): flux tCO2e/ha/yr (+ = emission) and stock MgC/ha
    "flux": {"BNP": -1.0, "BNNP": 0.5, "CA": 0.8, "CC": 2.5, "PF": -4.0, "PRG": 3.0, "HUM": -3.0, "RES": -9.0, "ENR": 0.1, "FAL": -2.0},
    "stock": {"BNP": 200, "BNNP": 170, "CA": 60, "CC": 45, "PF": 90, "PRG": 50, "HUM": 250, "RES": 70, "ENR": 40, "FAL": 55},
    "el_share": 0.35, "k_energy": 0.15, "a_full_parks": 0.04, "elasticity_income": 0.3,
    "ren_max_cn": 0.60, "eff_max_cn": 0.35, "budget_cut": 0.30,
    # biodiversity (41)
    "h": {"BNP": 1.0, "HUM": 1.0, "BNNP": 0.8, "RES": 0.55, "CA": 0.35, "PF": 0.15, "PRG": 0.15, "FAL": 0.3, "CC": 0.05, "ENR": 0.05},
    "z_sar": 0.35,
    "qB": {"CR": 0.55, "AS": 0.20, "GS": 0.12, "AGUA": 0.08, "CN": 0.05, "PAI": -0.25, "PEA": -0.06, "PIE": -0.03, "FRA": -0.45, "SE": -0.10},
    "k": {"B": 0.12, "F": 0.35, "E": 0.30, "C": 0.35, "Pc": 0.25, "pi": 0.35},
    # food (42)
    "yield": {"CC": 1.0, "CA": 0.7, "PRG": 0.25},
    "yield_trend": 0.006, "export0": 0.30, "kappa1": 2.5, "kappa2": 0.6,
    # economy (39)
    "g0": 0.02, "tax0": 0.15, "gamma": {1: 0.13, 2: 0.125, 3: 0.125}, "reserve_floor": 0.02,
    "i": {1: 0.025, 2: 0.035, 3: 0.045}, "alpha": {1: 0.15, 2: 0.12, 3: 0.10},
    "risk_premium": 0.05, "d0": 0.6,
    # economic security coefficients (37)
    "bE": {"PIE": 0.55, "PEA": 0.45, "PAI": 0.35, "FRA": 0.20, "SE": 0.15, "AS": 0.10, "GS": 0.10, "AGUA": 0.05, "CN": -0.10, "CR": -0.05},
    "value": {"CC": 1.0, "CA": 0.8, "PRG": 0.6, "PF": 0.9, "ENR": 1.2},
    # conflict (37/44)
    "cC": {"FRA": 0.60, "PAI": 0.30, "PIE": 0.20, "SE": -0.10},
    "greenC": {"CN": 0.25, "CR": 0.25, "AGUA": 0.15},
    "nu_gini": 3.0, "nu_just": 0.6, "wF_C": 0.6, "wE_C": 0.5, "wPe_C": 0.4,
    # pressures (38): impulse per unit efficiency (v1 factors, divided by 15 in logit space)
    "phi": {
        "a": {"AS": -2.0, "GS": -1.5, "PAI": -10.0, "PEA": -6.0, "CR": 3.0},
        "e": {"AS": -5.0, "CR": -12.5, "GS": -4.0, "AGUA": -4.0, "CN": -9.0, "PAI": 7.5, "FRA": 12.5, "SE": 10.0},
        "s": {"AS": -5.0, "AGUA": -3.5, "CN": -3.5, "CR": -2.5, "PAI": 5.0, "PIE": 3.5, "FRA": 7.5},
    },
    "phi_scale": 15.0,
    # pacts (36): logit shifts while active, annual cost (fraction of GDP) and entry (fraction of GDP)
    "pacts": {
        "treaty": {"unlock": 2030, "entry": 0.03, "annual": 0.002, "B": 0.25, "E": -0.05, "m_protect": 1.5, "m_deforest": 0.5},
        "accord": {"unlock": 2035, "entry": 0.05, "annual": 0.004, "E": -0.10, "Pc": -0.15, "s": 0.05, "u": 0.05},
        "tech":   {"unlock": 2038, "entry": 0.10, "annual": 0.008, "E": 0.15, "s": 0.10, "u": 0.05},
    },
}

# Starting conditions per level. HUM/RES/ENR/FAL start at 0 in every level.
LEVELS = {
    1: {"areas": {"BNNP": 100, "BNP": 0, "CA": 100, "CC": 100, "PF": 100, "PRG": 100},
        "B": 40, "F": 35, "E": 25, "C": 5, "Pc": 5, "pi": {"a": 30, "e": 30, "s": 30},
        "Y": 10_000, "D": 0, "R": 1_000, "eps0": 4.0},
    2: {"areas": {"BNNP": 80, "BNP": 20, "CA": 70, "CC": 150, "PF": 120, "PRG": 160},
        "B": 40, "F": 40, "E": 30, "C": 40, "Pc": 30, "pi": {"a": 20, "e": 25, "s": 15},
        "Y": 10_000, "D": 0, "R": 1_000, "eps0": 5.0},
    3: {"areas": {"BNNP": 60, "BNP": 40, "CA": 100, "CC": 100, "PF": 150, "PRG": 150},
        "B": 40, "F": 40, "E": 30, "C": 40, "Pc": 30, "pi": {"a": 25, "e": 20, "s": 20},
        "Y": 12_000, "D": 5_000, "R": 1_000, "eps0": 4.6},
}

# Random events (independent Bernoulli draws, 45). Effects: level shocks + stocks + land->fallow.
EVENTS = [
    {"id": "drought", "min": 1, "p": lambda s: 0.03 * (1 + 0.5 * s["t"] / 30) * (1 + 0.6 * max(0.0, 1 - forest_share(s) / s["anchor"]["forest0"]))
                                       + (0.04 if s["pol"]["AGUA"]["u"] == 0 else 0.0) + (0.02 if share(s, "CC") > 0.25 else 0.0),
     "fx": {"F%": -0.12, "C": 5, "pi_a": 4, "land": {"CC": 0.03, "CA": 0.05}}},
    {"id": "harvest", "min": 1, "p": lambda s: 0.03 + (0.03 if s["pol"]["AS"]["u"] else 0) + (0.02 if s["B"] > 50 else 0),
     "fx": {"F%": 0.15, "Y%": 0.01, "pi_a": -5, "C": -3}},
    {"id": "supply", "min": 2, "p": lambda s: 0.03 + (0.03 if s["pol"]["PEA"]["u"] else 0) + (0.02 if s["pol"]["PIE"]["u"] else 0),
     "fx": {"F%": -0.08, "E%": -0.10, "Y%": -0.015}},
    {"id": "scrutiny", "min": 2, "p": lambda s: (0.05 if s["B"] < 30 else 0) + (0.05 if s["c"] > 1.5 * s["anchor"]["c0"] else 0) + (0.04 if s["pol"]["FRA"]["u"] else 0),
     "fx": {"E%": -0.05, "pi_e": 8, "pi_s": 4}},
    {"id": "greenboom", "min": 2, "p": lambda s: 0.01 + (0.04 if s["pol"]["CN"]["u"] else 0) + (0.04 if s["pol"]["PIE"]["u"] else 0) + (0.02 if (100 - s["Pc"]) > 60 else 0),
     "fx": {"E%": 0.10, "Y%": 0.025, "pi_e": -4}},
    {"id": "justice", "min": 2, "p": lambda s: 0.05 if s["t"] > 5 else 0.0,
     "fx": {"pi_e": 7, "pi_s": 5, "C_if_calm": (-2, 3)}},
    {"id": "recession", "min": 3, "p": lambda s: 0.08 if s["E"] < 50 else 0.02,
     "fx": {"Y%": -0.04, "E%": -0.15, "C": 6}},
    {"id": "fossil", "min": 3, "p": lambda s: 0.03 + (0.05 if s["pol"]["SE"]["u"] else 0),
     "fx": {"E%": -0.10, "Y%": -0.02, "C": 7}},
]


# ──────────────────────────────────────────────────────────────────────────────────────────────
# State helpers
# ──────────────────────────────────────────────────────────────────────────────────────────────

def total_area(s) -> float:
    return sum(s["A"].values())


def share(s, k) -> float:
    return s["A"][k] / total_area(s)


def forest_share(s) -> float:
    return (s["A"]["BNNP"] + s["A"]["BNP"]) / total_area(s)


def habitat(s) -> float:
    return sum(P["h"][k] * s["A"][k] for k in LU) / total_area(s)


def productive_value(s) -> float:
    return sum(P["value"][k] * s["A"][k] for k in P["value"]) / total_area(s)


def concentration(s) -> float:
    prod = sum(s["A"][k] for k in ["CC", "CA", "PRG", "PF"]) or 1.0
    return (s["A"]["CC"] + s["A"]["PF"]) / prod


def productive_share(s) -> float:
    return sum(s["A"][k] for k in ["CC", "CA", "PRG"]) / total_area(s)


def food_production(s) -> float:
    pol = s["eta"]
    y = P["yield"]
    q = (s["A"]["CC"] * y["CC"] * (1 + 0.25 * pol["PAI"])
         + s["A"]["CA"] * y["CA"] * (1 + 0.15 * pol["AS"])
         + s["A"]["PRG"] * y["PRG"] * (1 + 0.20 * pol["GS"]))
    q *= (1 + 0.06 * pol["AGUA"]) * (1 + P["yield_trend"]) ** s["t"] * (1 + s["yield_shock"])
    x = P["export0"] + 0.20 * pol["PEA"]
    return (1 - x) * q


def new_state(level: int) -> dict:
    L = LEVELS[level]
    A = {k: 0.0 for k in LU}
    A.update({k: float(v) for k, v in L["areas"].items()})
    s = {
        "level": level, "t": 0.0, "year": 2024, "A": A, "pop": float(P["pop0"]),
        "B": float(L["B"]), "F": float(L["F"]), "E": float(L["E"]), "C": float(L["C"]), "Pc": float(L["Pc"]),
        "pi": dict(L["pi"]), "Y": float(L["Y"]), "D": float(L["D"]), "R": float(L["R"]),
        "pol": {j: {"u": 0, "T": 0.0, "ton": 0.0, "effort": [25.0, 25.0, 25.0, 25.0]} for j in POL},
        "pacts": {k: False for k in P["pacts"]},
        "tax": 0.0, "s_ren": 0.0, "u_eff": 0.0, "yield_shock": 0.0,
        "eta": {j: 0.0 for j in POL}, "c": 0.0, "cum_emis": 0.0,
        "breach": 0.0,  # years in breach, see step()
        "over": None, "impulses": [], "declared_BNP": 0.0, "lots": 0,
        "hist": [],
    }
    # anchors (deviation drivers are measured from these)
    s["anchor"] = {"H0": habitat(s), "V0": productive_value(s), "G0": concentration(s), "prod0": productive_share(s),
                   "aCC0": share(s, "CC"), "aPF0": share(s, "PF"), "forest0": forest_share(s), "Y0": s["Y"]}
    compute_eta(s)
    s["anchor"]["rho0"] = food_production(s) / s["pop"]
    dry = deepcopy(s)
    s["c"] = carbon(s, flows_ha=land_step(dry, 1.0), dt=1.0, update=False)
    s["anchor"]["c0"] = s["c"]
    s["anchor"]["E_tot0"] = s["c"] * s["pop"]
    s["anchor"]["pibar0"] = sum(s["pi"].values()) / 3
    s["anchor"]["pibar_e0"] = s["pi"]["e"]
    s["anchor"]["pol0"] = max(s["pi"].values()) - min(s["pi"].values())
    for X in ["B", "F", "E", "C", "Pc"]:
        s["anchor"]["l" + X] = logit(s[X] / 100)
    for kk in "aes":
        s["anchor"]["lpi" + kk] = logit(s["pi"][kk] / 100)
    s["anchor"]["W0"] = 100 - s["C"]
    s["anchor"]["E0"], s["anchor"]["F0"], s["anchor"]["B0"] = s["E"], s["F"], s["B"]
    return s


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Policies (35-36)
# ──────────────────────────────────────────────────────────────────────────────────────────────

CN_RELEVANCE = {  # instruments: [carbon tax, renewables, efficiency, CCS]
    "elec":  [0.6, 1.0, 0.3, 0.0],
    "other": [0.6, 0.15, 1.0, 0.5],
    "tax":   [1.0, 0.0, 0.0, 0.0],
}


def channel(effort, relevance=None) -> float:
    """Effort -> channel strength, normalised so an even 25/25/25/25 split gives 1."""
    rel = relevance or [1.0, 1.0, 1.0, 1.0]
    den = sum(r * phi(25.0, P["e0"]) for r in rel) or 1.0
    return sum(r * phi(e, P["e0"]) for r, e in zip(rel, effort)) / den


def base_eta(p, j) -> float:
    if not p["u"]:
        return 0.0
    ramp = 1 - math.exp(-p["ton"] / P["lam"][j])
    fatigue = P["eta_min"] + (1 - P["eta_min"]) * math.exp(-p["T"] / P["delta"][j])
    return ramp * fatigue


def compute_eta(s):
    for j in POL:
        p = s["pol"][j]
        s["eta"][j] = base_eta(p, j) * channel(p["effort"])
    p = s["pol"]["CN"]
    b = base_eta(p, "CN")
    s["eta_cn"] = {c: b * channel(p["effort"], CN_RELEVANCE[c]) for c in CN_RELEVANCE}


def policy_cost(s) -> float:
    k = 0.0
    for j in POL:
        p = s["pol"][j]
        if p["u"]:
            ebar = min(100.0, sum(p["effort"])) / 100.0
            k += P["kappa"][j] * s["Y"] * (P["cost_fixed_share"] + (1 - P["cost_fixed_share"]) * ebar)
    return k


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Land (43)
# ──────────────────────────────────────────────────────────────────────────────────────────────

def land_step(s, dt) -> dict:
    """Returns realised flows in ha (for LUC emissions); updates areas in place."""
    A, e = s["A"], s["eta"]
    m_protect = P["pacts"]["treaty"]["m_protect"] if s["pacts"]["treaty"] else 1.0
    m_def = P["pacts"]["treaty"]["m_deforest"] if s["pacts"]["treaty"] else 1.0
    d = P["deforest"]
    flows = {}
    flows[("BNNP", "BNP")] = A["BNNP"] * (d["BNNP_BNP"] + 0.05 * e["CR"]) * m_protect
    flows[("BNNP", "CC")] = A["BNNP"] * (d["BNNP_CC"] + 0.04 * e["PAI"] + 0.01 * e["FRA"]) * (1 - e["CR"]) * m_def
    flows[("BNNP", "CA")] = A["BNNP"] * (d["BNNP_CA"] + 0.02 * e["AS"]) * (1 - e["CR"])
    flows[("CA", "BNNP")] = A["CA"] * (d["CA_BNNP"] + 0.01 * e["AS"])
    flows[("RES", "BNP")] = A["RES"] * d["RES_BNP"]
    flows[("FAL", "BNNP")] = A["FAL"] * P["fallow_regen"]
    # agricultural reallocation pool: anchored rents keep the starting mix in equilibrium
    rent = {k: math.log(max(s["anchor"].setdefault("Aag0", {kk: max(A[kk], 1e-6) for kk in AG})[k], 1e-6)) for k in AG}
    tax_cn = s["eta_cn"]["tax"]
    rent["CC"] += 0.6 * e["PAI"] + 0.3 * e["PEA"] - 0.25 * e["AS"] - 0.2 * tax_cn
    rent["CA"] += 0.8 * e["AS"] - 0.2 * e["PAI"]
    rent["PRG"] += 0.4 * e["GS"] + 0.1 * e["PEA"]
    rent["PF"] += 0.2 * e["PIE"] + 0.15 * e["FRA"]
    w = {k: math.exp(P["beta_rent"] * rent[k]) for k in AG}
    tw = sum(w.values())
    pool_from = {k: A[k] * P["mu_ag"] for k in AG}
    pool_from["FAL"] = A["FAL"] * P["fallow_reentry"]
    pool = sum(pool_from.values())
    for src, amt in pool_from.items():
        for k in AG:
            if k != src:
                flows[(src, k)] = flows.get((src, k), 0.0) + amt * w[k] / tw
    # net bilateral flows: the pool is an allocation device, only net transitions are real
    for (i, j) in list(flows):
        if (j, i) in flows and i < j:
            net = flows[(i, j)] - flows[(j, i)]
            flows[(i, j)], flows[(j, i)] = max(net, 0.0), max(-net, 0.0)
    # apply (dt-scaled), never below zero
    out = {k: 0.0 for k in LU}
    for (i, j), f in flows.items():
        out[i] += f * dt
    scale = {i: (min(1.0, A[i] / out[i]) if out[i] > 0 else 1.0) for i in LU}
    realised = {}
    for (i, j), f in flows.items():
        amt = f * dt * scale[i]
        A[i] -= amt
        A[j] += amt
        realised[(i, j)] = amt * 1000.0  # ha
    return realised


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Carbon (40)
# ──────────────────────────────────────────────────────────────────────────────────────────────

def carbon(s, flows_ha, dt, update=True) -> float:
    e = s["eta"]
    cn = s["eta_cn"]
    if update:
        s_star = min(0.9, P["ren_max_cn"] * cn["elec"] + min(1.0, share(s, "ENR") / P["a_full_parks"])
                     + sum(P["pacts"][k].get("s", 0) for k in s["pacts"] if s["pacts"][k]))
        u_star = min(0.6, P["eff_max_cn"] * cn["other"] + sum(P["pacts"][k].get("u", 0) for k in s["pacts"] if s["pacts"][k]))
        s["s_ren"] = relax(s["s_ren"], min(0.95, s_star), P["k_energy"], dt)
        s["u_eff"] = relax(s["u_eff"], u_star, P["k_energy"], dt)
    eps0 = LEVELS[s["level"]]["eps0"]
    income = (s["Y"] / s["pop"]) / (s["anchor"]["Y0"] / P["pop0"])
    se = 1 + 0.15 * e["SE"]
    eps = eps0 * income ** P["elasticity_income"] * se * (P["el_share"] * (1 - s["s_ren"]) + (1 - P["el_share"]) * (1 - s["u_eff"]))
    energy = eps * s["pop"]
    f = dict(P["flux"])
    f["CC"] *= 1 + 0.3 * e["PAI"]
    f["PRG"] *= 1 - 0.35 * e["GS"]
    f["CA"] *= 1 - 0.4 * e["AS"]
    f["BNNP"] *= (1 + 1.0 * e["FRA"]) * (1 - 0.6 * e["CR"])
    afolu = sum(f[k] * s["A"][k] * 1000.0 for k in LU)
    luc = sum(amt * max(0.0, P["stock"][i] - P["stock"][j]) * 44 / 12 for (i, j), amt in flows_ha.items()) / max(dt, 1e-9)
    total = energy + afolu + luc
    s["emis"] = {"energy": energy, "afolu": afolu, "luc": luc, "total": total}
    return total / s["pop"]


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Economy (39)
# ──────────────────────────────────────────────────────────────────────────────────────────────

def economy_step(s, dt, upkeep=0.0):
    e, lvl = s["eta"], s["level"]
    fs = s.get("fiscal_stress", 0.0)
    g = P["g0"] + 0.01 * e["PIE"] + 0.005 * e["PEA"] - 0.0002 * s["tax"] - 0.01 * fs
    s["g"] = g
    Y = s["Y"] * (1 + g * dt)
    tax_rev = Y * (P["tax0"] + s["tax"] / 100) + 0.005 * Y * s["eta_cn"]["tax"]
    pact_cost = sum(P["pacts"][k]["annual"] * Y for k in s["pacts"] if s["pacts"][k])
    primary = tax_rev - P["gamma"][lvl] * Y - policy_cost(s) - pact_cost - upkeep
    d = s["D"] / s["Y"]
    i = P["i"][lvl] + P["risk_premium"] * max(0.0, d - P["d0"])
    interest = i * s["D"]
    amort = P["alpha"][lvl] * s["D"]
    R = s["R"] + (primary - interest - amort) * dt
    D = s["D"] - amort * dt
    floor = P["reserve_floor"] * Y
    if R < floor:  # automatic financing of the deficit
        D += floor - R
        R = floor
    s["Y"], s["R"], s["D"] = Y, R, max(0.0, D)
    s["primary"] = primary
    s["interest_burden"] = interest / max(tax_rev, 1e-9)
    s["fiscal_stress"] = s_high(s["interest_burden"], 0.20, 0.04)


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Indicators (37, 38, 41, 42, 44)
# ──────────────────────────────────────────────────────────────────────────────────────────────

def impulses(s, X) -> float:
    return sum(imp["d"] * math.exp(-(s["t"] - imp["t"]) / imp["tau"]) for imp in s["impulses"] if imp["X"] == X)


def indicators_step(s, dt, wear=None):
    a, e = s["anchor"], s["eta"]
    wear = wear or {}
    pacts_on = [k for k in s["pacts"] if s["pacts"][k]]
    pact = lambda key: sum(P["pacts"][k].get(key, 0.0) for k in pacts_on)
    k = P["k"]
    cap = lambda v: max(-0.6, min(0.6, v))

    # Biodiversity: species-area in logit space + policy quality
    gH = P["z_sar"] / (1 - a["B0"] / 100)
    dB = gH * math.log(habitat(s) / a["H0"]) + sum(P["qB"][j] * e[j] for j in POL)
    dB += 0.10 * min(e["AS"], e["CR"]) - 0.12 * min(e["PAI"], e["FRA"]) + pact("B") + cap(impulses(s, "B"))
    s["B*"] = target(a["lB"], dB)
    s["B"] = relax(s["B"], s["B*"], k["B"], dt)

    # Food security: supply/demand balance + access
    rho = max(food_production(s) / s["pop"], 1e-3 * a["rho0"])   # floor: a territory with no farmland still imports a little
    dF = P["kappa1"] * math.log(rho / a["rho0"]) + P["kappa2"] * (s["E"] - a["E0"]) / 50 + cap(impulses(s, "F"))
    s["F*"] = target(a["lF"], dF)
    s["F"] = relax(s["F"], s["F*"], k["F"], dt)

    # Economic security
    fs = s.get("fiscal_stress", 0.0)
    dE = sum(P["bE"][j] * e[j] for j in POL) - 0.15 * s["eta_cn"]["tax"]
    dE += 0.25 * (s.get("g", P["g0"]) - P["g0"]) / 0.01 + 1.5 * (productive_value(s) / a["V0"] - 1)
    dE += 0.15 * (s["B"] - a["B0"]) / 20 - 0.8 * (fs - 0.0) - 0.04 * s["tax"] - 0.6 * s_low(s["F"], 20, 4)
    dE += pact("E") + cap(impulses(s, "E"))
    s["E*"] = target(a["lE"], dE)
    s["E"] = relax(s["E"], s["E*"], k["E"], dt)

    # Social conflict (W = 100 - C)
    restriction = e["CR"] + 0.5 * s["eta_cn"]["tax"] + 0.3 * e["AGUA"]
    support = 0.5 * (e["AS"] + e["GS"])  # support instruments of the transition (see 44)
    just = support / (support + restriction) if (support + restriction) > 0 else 1.0
    dC = P["wF_C"] * (a["F0"] - s["F"]) / 15 + P["wE_C"] * (a["E0"] - s["E"]) / 15
    dC += P["wPe_C"] * (s["pi"]["e"] - a["pibar_e0"]) / 20
    dC += sum(P["cC"][j] * e[j] for j in P["cC"]) + 0.3 * fs * e["SE"]
    dC -= sum(P["greenC"][j] * e[j] for j in P["greenC"])
    dC += 2.0 * (share(s, "CC") - a["aCC0"]) + 1.0 * (share(s, "PF") - a["aPF0"])
    dC += P["nu_gini"] * (concentration(s) - a["G0"]) + P["nu_just"] * (1 - just) * restriction
    dC += 0.03 * s["tax"] + 0.6 * fs + wear.get("C", 0.0) + cap(impulses(s, "C"))
    s["C*"] = target(a["lC"], dC)
    s["C"] = relax(s["C"], s["C*"], k["C"], dt)
    W = 100 - s["C"]

    # Political collapse (St = 100 - Pc)
    pibar = sum(s["pi"].values()) / 3
    pol = max(s["pi"].values()) - min(s["pi"].values())
    dP = 0.9 * (a["W0"] - W) / 20 + 0.5 * (a["E0"] - s["E"]) / 20 + 0.8 * fs
    dP += 0.5 * (pol - a["pol0"]) / 30 + 0.6 * (pibar - a["pibar0"]) / 20 + pact("Pc") + cap(impulses(s, "Pc"))
    s["Pc*"] = target(a["lPc"], dP)
    s["Pc"] = relax(s["Pc"], s["Pc*"], k["Pc"], dt)

    # Sectoral pressures
    size = productive_share(s) / a["prod0"]
    ph = P["phi"]
    da = sum(v * e[j] for j, v in ph["a"].items()) * size / P["phi_scale"]
    da += 0.03 * (a["E0"] - s["E"]) + 0.02 * (a["F0"] - s["F"]) + 4.0 * (a["prod0"] - productive_share(s)) + wear.get("a", 0.0)
    de = sum(v * e[j] for j, v in ph["e"].items()) / P["phi_scale"]
    de += 0.035 * (a["B0"] - s["B"]) + 1.5 * (s["c"] - a["c0"]) / a["c0"] + wear.get("e", 0.0)
    ds = sum(v * e[j] for j, v in ph["s"].items()) / P["phi_scale"]
    ds += 0.04 * (a["W0"] - W) + 0.04 * s["tax"] + wear.get("s", 0.0)
    for kk, dd in (("a", da), ("e", de), ("s", ds)):
        dd += cap(impulses(s, "pi_" + kk))
        s["pi"][kk] = relax(s["pi"][kk], target(a["lpi" + kk], dd), k["pi"], dt)


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Events (45)
# ──────────────────────────────────────────────────────────────────────────────────────────────

def events_step(s, rng, dt):
    fired = []
    for ev in EVENTS:
        if s["level"] < ev["min"]:
            continue
        p = max(0.0, min(1.0, ev["p"](s)))
        if rng.random() < 1 - (1 - p) ** dt:
            fired.append(ev["id"])
            fx = ev["fx"]
            for X in ("F", "E"):
                if X + "%" in fx:
                    s[X] = max(0.0, min(100.0, s[X] * (1 + fx[X + "%"])))
            if "Y%" in fx:
                s["Y"] *= 1 + fx["Y%"]
            if "C" in fx:
                s["C"] = max(0.0, min(100.0, s["C"] + fx["C"]))
            if "C_if_calm" in fx:  # organised movement: lowers conflict when wellbeing is high
                calm, tense = fx["C_if_calm"]
                s["C"] = max(0.0, min(100.0, s["C"] + (calm if 100 - s["C"] > 65 else tense)))
            for kk in "aes":
                if "pi_" + kk in fx:
                    s["pi"][kk] = max(0.0, min(100.0, s["pi"][kk] + fx["pi_" + kk]))
            for lu, frac in fx.get("land", {}).items():  # conserved: land goes to fallow
                amt = s["A"][lu] * frac
                s["A"][lu] -= amt
                s["A"]["FAL"] += amt
    # persistent yield shock (AR(1)), dampened by water policy
    sd = 0.04 * (1 - 0.5 * s["eta"]["AGUA"])
    s["yield_shock"] = (0.5 ** dt) * s["yield_shock"] + rng.gauss(0, sd) * math.sqrt(dt)
    return fired


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Step
# ──────────────────────────────────────────────────────────────────────────────────────────────

BREACH_EPS = 1e-9  # years; tolerance of the 2-year bankruptcy test (v6/32)


def step(s, dt=1.0, rng=None, wear=None, upkeep=0.0):
    s["pop"] *= (1 + P["pop_growth"]) ** dt
    for j in POL:
        p = s["pol"][j]
        if p["u"]:
            p["ton"] += dt
            p["T"] += dt
        else:
            p["ton"] = 0.0
            p["T"] *= math.exp(-dt / P["rho_recovery"])
    fired = events_step(s, rng, dt) if rng else []
    compute_eta(s)
    flows = land_step(s, dt)
    economy_step(s, dt, upkeep)
    s["c"] = carbon(s, flows, dt)
    s["cum_emis"] += s["emis"]["total"] * dt
    indicators_step(s, dt, wear)
    s["t"] += dt
    s["year"] = 2024 + s["t"]
    s.setdefault("primary_hist", []).append((dt, s["primary"] / s["Y"]))
    window, acc, tot = 5.0, 0.0, 0.0
    for d_, v in reversed(s["primary_hist"]):
        if tot >= window:
            break
        acc += v * d_
        tot += d_
    s["primary_avg"] = acc / max(tot, 1e-9)
    n_prod = sum(1 for j in ("PAI", "PEA", "GS", "AS") if s["pol"][j]["u"])
    s["prod_years"] = s.get("prod_years", 0.0) + (dt if n_prod >= 2 else 0.0)
    # game over (37/39): St <= 5, B <= 5, F <= 10 (level >= 2), bankruptcy D/Y > 1 with burden > 0.2 for 2 years.
    # v6/32 fix: accumulating dt = 1/12 as a float gives 1.99999... < 2 after 24 months, so
    # bankruptcy fired in month 25 instead of month 24. The test now has a tolerance far below any
    # step (valid for every dt, unlike counting rounded months).
    if s["D"] / s["Y"] > 1.0 and s["interest_burden"] > 0.20:
        s["breach"] += dt
    else:
        s["breach"] = 0.0
    if 100 - s["Pc"] <= 5:
        s["over"] = "political"
    elif s["B"] <= 5:
        s["over"] = "ecological"
    elif s["level"] >= 2 and s["F"] <= 10:
        s["over"] = "famine"
    elif s["breach"] >= 2.0 - BREACH_EPS:
        s["over"] = "bankruptcy"
    return fired


def activate(s, ids, effort=None):
    for j in ids:
        p = s["pol"][j]
        p["u"] = 1
        if effort and j in effort:
            p["effort"] = list(effort[j])


def score(s) -> float:
    c0 = s["anchor"]["c0"]
    csc = 100 * max(0.0, min(1.0, (1.25 * c0 - s["c"]) / (1.0 * c0)))
    pbar = sum(s["pi"].values()) / 3
    ext = (s["F"] + s["E"] + (100 - s["C"]) + (100 - s["Pc"])) / 4
    lvl = s["level"]
    if lvl == 1:
        return 10 * (0.40 * s["B"] + 0.45 * csc + 0.15 * s["E"])
    if lvl == 2:
        return 10 * (0.15 * s["B"] + 0.20 * csc + 0.30 * (100 - pbar) + 0.35 * ext)
    ysc = min(100.0, 100 * s["Y"] / (2.0 * s["anchor"]["Y0"]))
    return 10 * (0.10 * s["B"] + 0.15 * csc + 0.20 * (100 - pbar) + 0.25 * ext + 0.30 * ysc)


def snapshot(s) -> dict:
    return {"B": s["B"], "F": s["F"], "E": s["E"], "W": 100 - s["C"], "St": 100 - s["Pc"], "c": s["c"],
            "pa": s["pi"]["a"], "pe": s["pi"]["e"], "ps": s["pi"]["s"], "DY": s["D"] / s["Y"], "RY": s["R"] / s["Y"],
            "forest": 100 * forest_share(s), "S": score(s), "ren": s["s_ren"], "Ygrowth": s["Y"] / s["anchor"]["Y0"], "budget": s["cum_emis"] / budget(s) if s["t"] > 0 else 0.0,
            "over": s["over"]}


def budget(s) -> float:
    """Cumulative emissions of a linear path to -30 % (budget_cut) by 2054, up to the current time (v6/38: the docstring said -50 %)."""
    E0, t = s["anchor"]["E_tot0"], s["t"]
    return E0 * (t - P["budget_cut"] * t * t / 60)


# ──────────────────────────────────────────────────────────────────────────────────────────────
# 3-level game: strategies and routes (48)
# ──────────────────────────────────────────────────────────────────────────────────────────────

STRATEGIES = {
    "do_nothing": {},
    "green": {"ids": ["CR", "AS", "AGUA", "CN"]},
    "extractive": {"ids": ["PAI", "PEA", "PIE", "FRA", "SE"]},
    "production": {"ids": ["PEA", "PIE", "GS", "AS"]},
    "innovation": {"ids": ["CN", "PIE", "AS"], "effort": {"CN": [20, 40, 40, 0]}, "pacts": ["accord", "tech"]},
    "conservation": {"ids": ["CR", "AS", "GS"], "pacts": ["treaty"]},
    "balanced": {"ids": ["CR", "AS", "PEA", "CN", "PIE"]},
    "tech_tax": {"ids": ["CN"], "effort": {"CN": [100, 0, 0, 0]}},
}


def play_level(level, strat, seed=None, years=30, dt=1.0, tax=None):
    s = new_state(level)
    rng = random.Random(seed) if seed is not None else None
    st = STRATEGIES[strat]
    activate(s, st.get("ids", []), st.get("effort"))
    s["tax"] = tax if tax is not None else (2.0 if level == 3 and st.get("ids") else 0.0)
    steps = int(round(years / dt))
    for n in range(steps):
        yr = 2024 + s["t"]
        for pk in st.get("pacts", []):
            if not s["pacts"][pk] and yr >= P["pacts"][pk]["unlock"] and level >= 2:
                s["pacts"][pk] = True
                s["R"] -= P["pacts"][pk]["entry"] * s["Y"]
        step(s, dt, rng)
        if (n + 1) % int(round(1 / dt)) == 0:
            s["hist"].append(snapshot(s))
        if s["over"]:
            break
    return s


ROUTES3 = {
    1: {"floors": lambda h, s: h["B"] >= 25 and h["E"] >= 15 and h["DY"] <= 0.8,
        "conservation": lambda h, s: h["B"] >= 50 and h["forest"] >= 20 and h["c"] <= 5.2,
        "production": lambda h, s: h["E"] >= 36 and h["F"] >= 32 and h["c"] <= 6.5,
        "innovation": lambda h, s: h["c"] <= 4.6 and h["E"] >= 30},
    2: {"floors": lambda h, s: h["B"] >= 25 and h["F"] >= 25 and h["St"] >= 35 and max(h["pa"], h["pe"], h["ps"]) <= 85,
        "conservation": lambda h, s: h["B"] >= 52 and h["forest"] >= 16 and h["c"] <= 6.5,
        "production": lambda h, s: h["E"] >= 40 and h["F"] >= 32 and h["W"] >= 60,
        "innovation": lambda h, s: h["c"] <= 5.5 and h["ren"] >= 0.30 and h["E"] >= 33},
    3: {"floors": lambda h, s: h["St"] >= 30 and h["DY"] <= 1.0 and h["W"] >= 35,
        "conservation": lambda h, s: h["B"] >= 52 and h["forest"] >= 17 and h["c"] <= 5.4 and h["DY"] <= 0.6,
        "production": lambda h, s: h["E"] >= 36 and h["F"] >= 33 and h["W"] >= 52,
        "innovation": lambda h, s: h["c"] <= 4.5 and h["ren"] >= 0.35 and h["E"] >= 30 and sum(s["pacts"].values()) >= 1,
        "equilibrium": lambda h, s: sum([h["B"] >= 50, h["F"] >= 40, h["E"] >= 38, h["W"] >= 65, h["St"] >= 75, h["c"] <= 4.5,
                                         h["DY"] <= 0.5, h["Ygrowth"] >= 1.7, h["S"] >= 720]) >= 7},
}
MULT = {"conservation": 1.0, "production": 1.0, "innovation": 1.1, "equilibrium": 1.35}


def routes3(s):
    h = s["hist"][-1]
    R = ROUTES3[s["level"]]
    if s["over"] or not R["floors"](h, s):
        return None, []
    met = [r for r in ("conservation", "production", "innovation", "equilibrium") if r in R and R[r](h, s)]
    best = max(met, key=lambda r: MULT[r]) if met else None
    return best, met


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Territorio (46): monthly engine, public uses, situations as decaying target impulses
# ──────────────────────────────────────────────────────────────────────────────────────────────

SITUATIONS = json.loads((Path(__file__).parent / "situations.json").read_text()) if (Path(__file__).parent / "situations.json").exists() else []
LOT = 5.0
USE_COST = {"protected": 100, "wetland": 225, "restoration": 300, "energy": 400}
USE_TARGET = {"protected": "BNP", "wetland": "HUM", "restoration": "RES", "energy": "ENR"}
USE_FROM = {"protected": ["BNNP"], "wetland": ["CC", "PRG", "FAL"], "restoration": ["CC", "PRG", "FAL"], "energy": ["PRG", "CC", "FAL"]}
IMPULSE_TAU = 18 / 12 / math.log(2)   # half-life of 18 months
SIT_MAP = {"biodiversity": "B", "foodSecurity": "F", "economicSecurity": "E", "stella.Conflicto_social": "C",
           "stella.Colapso_politico": "Pc", "stella.PP_AGRICOLA": "pi_a", "stella.PP_AMBIENTALISTA": "pi_e", "stella.PP_SOCIAL": "pi_s"}


def value_of(s, X):
    return s["pi"][X[3:]] if X.startswith("pi_") else s[X]


def cost_scale(s) -> float:
    """Price/income scale of the treasury with the economy: min(2.5, max(1, sqrt(Y/Y0))) (situationCost)."""
    return min(2.5, max(1.0, math.sqrt(s["Y"] / s["anchor"]["Y0"])))


def add_situation_effect(s, eff):
    X = SIT_MAP.get(eff["indicator"])
    if X:
        v = max(1.0, min(99.0, value_of(s, X)))
        dpts = eff["abs"] if eff["abs"] is not None else (eff["pct"] or 0) * v
        dl = dpts / (100 * (v / 100) * (1 - v / 100))
        s["impulses"].append({"X": X, "d": dl, "t": s["t"], "tau": IMPULSE_TAU})
    elif eff["indicator"] == "stella.Reservas_del_Tesoro" and eff["abs"] is not None:
        # v6/32 fix (spec 47): only positive incomes scale with the economy, like costs do;
        # a negative effect is a fixed charge (it used to be scaled too).
        s["R"] += eff["abs"] * cost_scale(s) if eff["abs"] > 0 else eff["abs"]
    elif eff["indicator"] == "stella.Deuda" and eff["abs"] is not None:
        s["D"] = max(0.0, s["D"] + eff["abs"])


def move_land(s, src, dst, amt) -> float:
    """Conservative transfer of up to `amt` kHa from src to dst; returns what actually moved."""
    amt = max(0.0, min(amt, s["A"][src]))
    s["A"][src] -= amt
    s["A"][dst] += amt
    if src == "BNP":  # declared protected area cannot exceed what is still protected forest
        s["declared_BNP"] = min(s["declared_BNP"], s["A"]["BNP"])
    return amt


def apply_land_effects(s, effects):
    """v6/32 fix: landUseChange effects of a situation option (they were ignored).

    The catalogue writes them as +/- pairs inside one option (e.g. HUM +5, CC -5). Pairs are a direct
    transfer origin -> destination (00/37 discrepancy: the "positive comes from fallow" rule would
    depend on the order of the list). What is left unpaired follows phase 37: a loose negative goes
    to fallow (FAL), a loose positive is taken from FAL, then PRG, then CC. Land moved by a
    situation is never counted as *declared* protected area (47: only declarations count).
    """
    neg = [[e["land"]["target"], -e["land"]["kHa"]] for e in effects if e.get("land") and (e["land"]["kHa"] or 0) < 0]
    pos = [[e["land"]["target"], e["land"]["kHa"]] for e in effects if e.get("land") and (e["land"]["kHa"] or 0) > 0]
    for n in neg:
        for p_ in pos:
            if n[1] <= 0:
                break
            if p_[1] <= 0 or p_[0] == n[0]:
                continue
            # one pair = one transfer; if the origin is short only what exists moves, and the
            # destination's unmet part is not taken from anywhere else
            want = min(n[1], p_[1])
            move_land(s, n[0], p_[0], want)
            n[1] -= want
            p_[1] -= want
        if n[1] > 0:
            move_land(s, n[0], "FAL", n[1])
    for p_ in pos:
        for src in ("FAL", "PRG", "CC"):
            if p_[1] <= 0:
                break
            if src != p_[0]:
                p_[1] -= move_land(s, src, p_[0], p_[1])


def apply_option(s, opt):
    for eff in opt["effects"]:
        add_situation_effect(s, eff)
    apply_land_effects(s, opt["effects"])


WHEN_NAMES = ("A", "B", "F", "E", "W", "St", "pa", "pe", "ps", "D", "Y", "R")


def when_holds(s, d) -> bool:
    """Evaluates the `when` predicate exported by export_situations.ts (v6/32 fix: it was ignored).

    `whenExpr` uses only the names in WHEN_NAMES, numbers and comparison/arithmetic operators;
    a predicate the exporter could not translate (`whenExpr` null while `hasWhen`) counts as true.
    """
    expr = d.get("whenExpr")
    if not expr:
        return True
    env = {"A": s["A"], "B": s["B"], "F": s["F"], "E": s["E"], "W": 100 - s["C"], "St": 100 - s["Pc"],
           "pa": s["pi"]["a"], "pe": s["pi"]["e"], "ps": s["pi"]["s"], "D": s["D"], "Y": s["Y"], "R": s["R"]}
    return bool(eval(expr, {"__builtins__": {}}, env))


def pay(s, cost) -> bool:
    """Public investment: paid from reserves above the floor, the rest financed with debt while D/Y <= 0.6."""
    free = max(0.0, s["R"] - P["reserve_floor"] * s["Y"])
    from_debt = max(0.0, cost - free)
    if from_debt > 0 and (s["D"] + from_debt) / s["Y"] > P["d0"]:
        return False
    s["R"] -= cost - from_debt
    s["D"] += from_debt
    return True


def declare(s, use):
    # v6/32 fix: pay() already charges the lot; the old code charged it a second time
    # (`s["R"] -= cost`) and also charged when no source use had a full lot left.
    src = next((k for k in USE_FROM[use] if s["A"][k] >= LOT), None)
    if src is None:
        return False
    cost = USE_COST[use] * cost_scale(s)
    if not pay(s, cost):
        return False
    s["A"][src] -= LOT
    s["A"][USE_TARGET[use]] += LOT
    s["lots"] += 1
    if use == "protected":
        s["declared_BNP"] += LOT
    return True


TERR_STRATEGIES = {
    "do_nothing": {"settle": "none"},
    "conservation": {"ids": ["CR", "AS", "AGUA"], "uses": ["protected"] * 6 + ["wetland", "restoration"] * 3, "every": 12,
                     "pacts": ["treaty"], "tax_from_2035": 2.0, "settle": "first"},
    "production": {"ids": ["PAI", "PEA", "PIE", "GS"], "settle": "first"},
    "innovation": {"ids": ["CN", "GS", "AS"], "uses": ["energy"] * 4, "every": 18, "effort": {"CN": [20, 40, 40, 0]},
                   "pacts": ["tech"], "tax_from_2035": 2.0, "settle": "first"},
    "settle_only": {"settle": "first"},
    "cheap_production": {"ids": ["PEA"], "settle": "first"},
    "extractive": {"ids": ["PAI", "PEA", "PIE", "FRA", "SE"], "settle": "first"},
    "buy_everything": {"ids": ["CR", "CN", "AS"], "uses": ["protected", "energy", "wetland", "restoration"] * 6, "every": 1, "settle": "first"},
}

BASE_ARRIVAL = 0.16


def play_territorio(strat, seed, months=360):
    s = new_state(2)
    rng = random.Random(seed)
    rng_sit = random.Random(seed + 7919)
    st = TERR_STRATEGIES[strat]
    activate(s, st.get("ids", []))          # even split: instruments unlock in 2029 (calendar.ts)
    effort_pending = dict(st.get("effort", {}))
    uses = list(st.get("uses", []))
    inbox = []  # open situations: dict(def, opened, expires)
    sustained = {"W": 0, "F": 0}
    dt = 1 / 12
    for m in range(months):
        yr = 2024 + s["t"]
        if effort_pending and yr >= 2029:
            for j, eff in effort_pending.items():
                s["pol"][j]["effort"] = list(eff)
            effort_pending = {}
        for pk in st.get("pacts", []):
            if not s["pacts"][pk] and yr >= P["pacts"][pk]["unlock"] and pay(s, P["pacts"][pk]["entry"] * s["Y"]):
                s["pacts"][pk] = True
        if uses and m % st.get("every", 1) == 0 and declare(s, uses[0]):
            uses.pop(0)
        if st.get("tax_from_2035") and yr >= 2035:
            s["tax"] = st["tax_from_2035"]
        # inbox: settle first affordable option
        if st["settle"] == "first":
            for item in list(inbox):
                for opt in item["def"]["options"]:
                    cost = opt["cost"] * cost_scale(s)
                    if pay(s, cost):
                        apply_option(s, opt)
                        inbox.remove(item)
                        break
        # wear of open items: logit push on the targets while open
        wear = {"C": 0.0, "a": 0.0, "e": 0.0, "s": 0.0}
        for item in inbox:
            age = (m - item["opened"]) / max(1, item["expires"] - item["opened"])
            f = 1 + min(1.0, age)
            w = item["def"]["wear"]
            wear["C"] += 0.04 * f * w.get("conflict", 0)
            wear["a"] += 0.04 * f * w.get("ppAgricola", 0)
            wear["e"] += 0.04 * f * w.get("ppAmbientalista", 0)
            wear["s"] += 0.04 * f * w.get("ppSocial", 0)
        upkeep = 0.8 * (s["declared_BNP"] + s["A"]["HUM"] + s["A"]["RES"] + s["A"]["ENR"])
        step(s, dt, rng, wear, upkeep)
        # expirations -> last option
        for item in list(inbox):
            if m >= item["expires"]:
                apply_option(s, item["def"]["options"][-1])
                inbox.remove(item)
        # arrivals
        i = {"W": 100 - s["C"], "F": s["F"], "B": s["B"], "pmax": max(s["pi"].values())}
        p = BASE_ARRIVAL + (0.05 if i["W"] < 45 else 0) + (0.04 if i["F"] < 40 else 0) + (0.03 if i["B"] < 35 else 0) + (0.05 if i["pmax"] > 65 else 0)
        if len(inbox) < 6 and rng_sit.random() < min(0.4, p) and SITUATIONS:
            open_ids = {it["def"]["id"] for it in inbox}
            pool = [d for d in SITUATIONS if d["id"] not in open_ids and when_holds(s, d)]
            tw = sum(d["weight"] for d in pool)
            r = rng_sit.random() * tw if pool else 0.0  # like rollSituation: no draw when nothing is eligible
            for d in pool:
                r -= d["weight"]
                if r < 0:
                    inbox.append({"def": d, "opened": m, "expires": m + d["deadline"]})
                    break
        # drop fully decayed impulses
        s["impulses"] = [imp for imp in s["impulses"] if s["t"] - imp["t"] < 6 * imp["tau"]]
        # sustained breach (12 months)
        sustained["W"] = sustained["W"] + 1 if 100 - s["C"] < 10 else 0
        sustained["F"] = sustained["F"] + 1 if s["F"] < 20 else 0
        if sustained["W"] >= 12 or sustained["F"] >= 12:
            s["over"] = "sustained"
        if s["over"]:
            break
    return s


def territorio_routes(s) -> dict:
    T = total_area(s)
    pub = 100 * (s["declared_BNP"] + s["A"]["HUM"] + s["A"]["RES"]) / T
    enr = 100 * s["A"]["ENR"] / T
    floors = s["B"] >= 25 and s["F"] >= 20 and (100 - s["Pc"]) >= 25 and (100 - s["C"]) >= 12 and not s["over"]
    cons = s["B"] >= TERR_ROUTES["cons_B"] and 100 * forest_share(s) >= 15 and pub >= TERR_ROUTES["cons_pub"] and s["c"] <= TERR_ROUTES["cons_c"]
    prod = s["F"] >= TERR_ROUTES["prod_F"] and s["E"] >= TERR_ROUTES["prod_E"] and s["primary_avg"] >= 0 and s["D"] / s["Y"] <= 0.6 and s["prod_years"] >= TERR_ROUTES["prod_years"] and (100 - s["C"]) >= TERR_ROUTES["prod_W"]
    inno = s["c"] <= TERR_ROUTES["inno_c"] and enr >= TERR_ROUTES["inno_enr"] and (100 - s["C"]) >= TERR_ROUTES["inno_W"]
    met = [r for r, ok in (("conservation", cons), ("production", prod), ("innovation", inno)) if ok]
    return {"floors": floors, "met": met if floors else [], "pub": pub, "enr": enr}


TERR_ROUTES = {"cons_B": 52, "cons_pub": 8, "cons_c": 6.2, "prod_F": 44, "prod_E": 40, "prod_years": 15, "prod_W": 55,
               "inno_c": 4.8, "inno_enr": 1.6, "inno_W": 55}


# ──────────────────────────────────────────────────────────────────────────────────────────────
# Reports
# ──────────────────────────────────────────────────────────────────────────────────────────────

def fmt(x, n=1):
    return f"{x:.{n}f}" if isinstance(x, (int, float)) else str(x)


def golden():
    print("level,strategy,year,B,F,E,W,St,c,pa,pe,ps,DY,S")
    for lvl in (1, 2, 3):
        for strat in ("do_nothing", "green", "extractive"):
            s = play_level(lvl, strat)
            for yr in (1, 10, 30):
                h = s["hist"][yr - 1] if len(s["hist"]) >= yr else s["hist"][-1]
                print(",".join([str(lvl), strat, str(yr)] + [fmt(h[k], 3) for k in ("B", "F", "E", "W", "St", "c", "pa", "pe", "ps", "DY", "S")]))


if __name__ == "__main__":
    if "--golden" in sys.argv:
        golden()
    else:
        for lvl in (1, 2, 3):
            print(f"\n== Level {lvl} (no events, year 30)")
            print("strategy      B     F     E     W    St     c    pa    pe    ps   D/Y  R/Y  forest   S  budget over")
            for strat in STRATEGIES:
                s = play_level(lvl, strat)
                h = s["hist"][-1]
                print(f"{strat:12s} " + " ".join(fmt(h[k]).rjust(5) for k in ("B", "F", "E", "W", "St", "c", "pa", "pe", "ps"))
                      + f" {h['DY']:5.2f} {h['RY']:5.2f} {h['forest']:5.1f} {h['S']:5.0f} {h['budget']:5.2f} {h['over']}")
