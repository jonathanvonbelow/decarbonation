"""Reference cases of phase 41 (food security by supply/demand balance) from the prototype, for tests/sim/food.v2.spec.ts.

    python scripts/reference/food41_cases.py > scripts/reference/food41_cases.json

Each case perturbs a level's starting state (efficiencies, areas, F, E, population, model time, yield shock), runs the
prototype's `indicators_step` once and records F* and the relaxed F. F reads the E of the start of the step (E is
updated after F). Regenerate whenever modelo_v2.py changes F or food_production.
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
    for src, dst in (("BNNP", "CC"), ("PRG", "HUM"), ("CC", "CA"), ("CA", "FAL"), ("PF", "PRG"), ("CC", "ENR")):
        amt = rnd.random() * 0.3 * s["A"][src]
        s["A"][src] -= amt
        s["A"][dst] += amt
    s["F"] = 5 + 90 * rnd.random()
    s["E"] = 5 + 90 * rnd.random()
    s["pop"] = m.P["pop0"] * (0.9 + 0.4 * rnd.random())
    s["t"] = 30 * rnd.random()
    s["yield_shock"] = rnd.choice([0.0, 0.0, -0.1 * rnd.random(), 0.05 * rnd.random()])
    inp = {"level": level, "dt": dt, "eta": eta, "areas": dict(s["A"]), "F": s["F"], "E": s["E"], "pop": s["pop"],
           "t": s["t"], "shock": s["yield_shock"]}
    s["eta"] = eta
    s["eta_cn"] = {"elec": 0.0, "other": 0.0, "tax": 0.0}
    m.indicators_step(s, dt)
    return {"in": inp, "out": {"Fstar": s["F*"], "F": s["F"]}}


def main():
    rnd = random.Random(41)
    cases = [case(level, rnd, dt) for level in (1, 2, 3) for dt in (1.0, 1 / 12) for _ in range(4)]
    print(json.dumps(cases, indent=1))


if __name__ == "__main__":
    main()
