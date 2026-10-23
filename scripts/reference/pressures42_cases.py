"""Reference cases of phase 42 (sectoral pressures in S) from the prototype, for tests/sim/pressures.v2.spec.ts.

    python scripts/reference/pressures42_cases.py > scripts/reference/pressures42_cases.json

Each case perturbs a level's starting state (efficiencies, areas, B, F, E, C, c, the three pressures, the additional
tax, the wear of open situations), runs the prototype's `indicators_step` once and records the B, F, E and C it left
(the pressure block, last, reads them) and the three relaxed pressures. The targets are recovered from the exact
relaxation: π* = (π' − π·q)/(1 − q), q = (1 − k_π)^dt. Regenerate whenever modelo_v2.py changes the pressures.
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import modelo_v2 as m  # noqa: E402


def case(level, rnd, dt):
    s = m.new_state(level)
    eta = {j: (rnd.random() if rnd.random() < 0.6 else 0.0) for j in m.POL}
    for src, dst in (("BNNP", "CC"), ("PRG", "HUM"), ("CC", "CA"), ("CA", "FAL"), ("PF", "PRG"), ("CC", "ENR"), ("PRG", "RES")):
        amt = rnd.random() * 0.3 * s["A"][src]
        s["A"][src] -= amt
        s["A"][dst] += amt
    for X in ("B", "F", "E", "C", "Pc"):
        s[X] = 5 + 90 * rnd.random()
    s["c"] = s["anchor"]["c0"] * (0.5 + 1.2 * rnd.random())
    s["pi"] = {k: 2 + 96 * rnd.random() for k in "aes"}
    s["tax"] = rnd.choice([0.0, 0.0, 20 * rnd.random()])
    wear = rnd.choice([{}, {"a": rnd.uniform(-0.5, 0.5), "e": rnd.uniform(-0.5, 0.5), "s": rnd.uniform(-0.5, 0.5)}])
    s["eta"] = eta
    s["eta_cn"] = {"elec": 0.0, "other": 0.0, "tax": 0.0}
    pi_in = dict(s["pi"])
    inp = {"level": level, "dt": dt, "eta": eta, "areas": dict(s["A"]), "c": s["c"], "pi": pi_in, "tax": s["tax"], "wear": wear,
           "F": s["F"], "E": s["E"], "C": s["C"], "B": s["B"]}
    m.indicators_step(s, dt, wear)
    q = (1 - m.P["k"]["pi"]) ** dt
    star = {k: (s["pi"][k] - pi_in[k] * q) / (1 - q) for k in "aes"}
    # what the pressure block read: the indicators after their own update this step
    inp["after"] = {"B": s["B"], "F": s["F"], "E": s["E"], "W": 100 - s["C"]}
    return {"in": inp, "out": {"pi": s["pi"], "star": star}}


def main():
    rnd = random.Random(42)
    cases = [case(level, rnd, dt) for level in (1, 2, 3) for dt in (1.0, 1 / 12) for _ in range(4)]
    print(json.dumps(cases, indent=1))


if __name__ == "__main__":
    main()
