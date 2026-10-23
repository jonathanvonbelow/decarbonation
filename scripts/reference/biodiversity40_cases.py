"""Reference cases of phase 40 (biodiversity by species-area) from the prototype, for tests/sim/biodiversity.v2.spec.ts.

    python scripts/reference/biodiversity40_cases.py > scripts/reference/biodiversity40_cases.json

Each case perturbs a level's starting state (efficiencies, areas, B, pacts), runs the prototype's `indicators_step`
once and records B* and the relaxed B. The prototype has no map: connectivity is not part of these cases.
Regenerate whenever modelo_v2.py changes B.
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import modelo_v2 as m  # noqa: E402

PACT_IDS = {"treaty": "biodiversityTreaty", "accord": "globalCarbonAccord", "tech": "techTransferInitiative"}


def case(level, rnd, dt):
    s = m.new_state(level)
    eta = {j: (rnd.random() if rnd.random() < 0.6 else 0.0) for j in m.POL}
    for src, dst in (("BNNP", "CC"), ("PRG", "HUM"), ("CC", "RES"), ("CA", "FAL"), ("BNNP", "BNP"), ("PRG", "ENR")):
        amt = rnd.random() * 0.3 * s["A"][src]
        s["A"][src] -= amt
        s["A"][dst] += amt
    s["B"] = 5 + 90 * rnd.random()
    s["pacts"] = {k: rnd.random() < 0.4 for k in s["pacts"]}
    inp = {"level": level, "dt": dt, "eta": eta, "areas": dict(s["A"]), "B": s["B"],
           "pacts": [PACT_IDS[k] for k, on in s["pacts"].items() if on]}
    s["eta"] = eta
    s["eta_cn"] = {"elec": 0.0, "other": 0.0, "tax": 0.0}
    m.indicators_step(s, dt)
    return {"in": inp, "out": {"Bstar": s["B*"], "B": s["B"]}}


def main():
    rnd = random.Random(40)
    cases = [case(level, rnd, dt) for level in (1, 2, 3) for dt in (1.0, 1 / 12) for _ in range(4)]
    print(json.dumps(cases, indent=1))


if __name__ == "__main__":
    main()
