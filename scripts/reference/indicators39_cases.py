"""Reference cases of phase 39 (E, C, Pc by relaxation) from the prototype, for tests/sim/indicators.v2.spec.ts.

    python scripts/reference/indicators39_cases.py > scripts/reference/indicators39_cases.json

Each case perturbs a level's starting state (efficiencies, areas, B/F/E/C/Pc, pressures, growth, tax, pacts),
runs the prototype's `indicators_step` once and records the B and F it produced (inputs of E, C, Pc in the
port, which still computes B and F with model 1.1) and E*, C*, Pc* and the relaxed E, C, Pc.
The concentration and just-transition terms of the conflict belong to phase 45: they are switched off here
(nu_gini = nu_just = 0). Fiscal stress is 0 (phase 44). Regenerate whenever modelo_v2.py changes E, C or Pc.
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import modelo_v2 as m  # noqa: E402

m.P["nu_gini"] = 0.0
m.P["nu_just"] = 0.0

PACT_IDS = {"treaty": "biodiversityTreaty", "accord": "globalCarbonAccord", "tech": "techTransferInitiative"}


def case(level, rnd, dt):
    s = m.new_state(level)
    eta = {j: (rnd.random() if rnd.random() < 0.6 else 0.0) for j in m.POL}
    tax_ch = rnd.random() * eta["CN"]
    # land: move some area between uses (total conserved)
    for src, dst in (("BNNP", "CC"), ("PRG", "PF"), ("CA", "ENR"), ("CC", "FAL")):
        amt = rnd.random() * 0.3 * s["A"][src]
        s["A"][src] -= amt
        s["A"][dst] += amt
    for X in ("B", "F", "E", "C", "Pc"):
        s[X] = 5 + 90 * rnd.random()
    s["pi"] = {k: 100 * rnd.random() for k in "aes"}
    s["g"] = 0.02 + 0.02 * (rnd.random() - 0.5)
    s["tax"] = rnd.choice([0.0, 0.0, 5.0, 12.0])
    s["pacts"] = {k: rnd.random() < 0.4 for k in s["pacts"]}
    inp = {
        "level": level, "dt": dt, "eta": eta, "taxChannel": tax_ch, "areas": dict(s["A"]),
        "E": s["E"], "C": s["C"], "Pc": s["Pc"], "pi": dict(s["pi"]), "g": s["g"], "tax": s["tax"],
        "pacts": [PACT_IDS[k] for k, on in s["pacts"].items() if on],
    }
    s["eta"] = eta
    s["eta_cn"] = {"elec": 0.0, "other": 0.0, "tax": tax_ch}
    m.indicators_step(s, dt)
    out = {"B": s["B"], "F": s["F"], "Estar": s["E*"], "Cstar": s["C*"], "Pcstar": s["Pc*"], "E": s["E"], "C": s["C"], "Pc": s["Pc"]}
    return {"in": inp, "out": out}


def main():
    rnd = random.Random(39)
    cases = [case(level, rnd, dt) for level in (1, 2, 3) for dt in (1.0, 1 / 12) for _ in range(4)]
    print(json.dumps(cases, indent=1))


if __name__ == "__main__":
    main()
