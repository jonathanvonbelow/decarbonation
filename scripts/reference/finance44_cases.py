"""Reference cases of phase 44 (public finance) from the prototype, for tests/sim/finance.v2.spec.ts.

    python scripts/reference/finance44_cases.py > scripts/reference/finance44_cases.json

Each `step` case perturbs a level's starting state (GDP, debt, reserves, extra tax, the efficiencies the economy reads,
the fiscal stress of the previous step, active policies with their effort, pacts, the upkeep of public uses), runs the
prototype's `economy_step` once and records Y, R, D, the primary balance, g, the interest burden and the fiscal stress.
Each `pay` case runs `pay()` (public investment) on a perturbed state. Regenerate whenever modelo_v2.py changes them.
"""
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import modelo_v2 as m  # noqa: E402


def step_case(level, rnd, dt):
    s = m.new_state(level)
    s["Y"] = s["Y"] * (0.6 + 1.2 * rnd.random())
    s["D"] = s["Y"] * rnd.choice([0.0, 0.3 * rnd.random(), 0.5 + 0.8 * rnd.random()])
    s["R"] = s["Y"] * rnd.choice([0.0, 0.01, 0.15 * rnd.random()])
    s["tax"] = rnd.choice([0.0, 0.0, 20 * rnd.random()])
    s["fiscal_stress"] = rnd.choice([0.0, rnd.random()])
    eta = {j: 0.0 for j in m.POL}
    eta["PIE"] = rnd.choice([0.0, rnd.random()])
    eta["PEA"] = rnd.choice([0.0, rnd.random()])
    s["eta"] = eta
    s["eta_cn"] = {"elec": 0.0, "other": 0.0, "tax": rnd.choice([0.0, rnd.random()])}
    pols = {}
    for j in m.POL:
        if rnd.random() < 0.4:
            effort = [rnd.choice([0, 10, 25, 40]) for _ in range(4)]
            s["pol"][j]["u"] = 1
            s["pol"][j]["effort"] = effort
            pols[j] = effort
    pacts = [k for k in m.P["pacts"] if rnd.random() < 0.4]
    for k in pacts:
        s["pacts"][k] = True
    upkeep = rnd.choice([0.0, 0.0, 200 * rnd.random()])
    inp = {"level": level, "dt": dt, "Y": s["Y"], "D": s["D"], "R": s["R"], "tax": s["tax"], "stress": s["fiscal_stress"],
           "PIE": eta["PIE"], "PEA": eta["PEA"], "cnTax": s["eta_cn"]["tax"], "policies": pols, "pacts": pacts, "upkeep": upkeep}
    m.economy_step(s, dt, upkeep)
    out = {"Y": s["Y"], "R": s["R"], "D": s["D"], "primary": s["primary"], "g": s["g"],
           "burden": s["interest_burden"], "stress": s["fiscal_stress"]}
    return {"in": inp, "out": out}


def pay_case(rnd):
    s = m.new_state(2)
    s["Y"] = 10_000 * (0.8 + 0.6 * rnd.random())
    s["D"] = s["Y"] * 0.7 * rnd.random()
    s["R"] = s["Y"] * 0.1 * rnd.random()
    cost = s["Y"] * 0.12 * rnd.random()
    inp = {"Y": s["Y"], "D": s["D"], "R": s["R"], "cost": cost}
    ok = m.pay(s, cost)
    return {"in": inp, "out": {"ok": ok, "R": s["R"], "D": s["D"]}}


def main():
    rnd = random.Random(44)
    steps = [step_case(level, rnd, dt) for level in (1, 2, 3) for dt in (1.0, 1 / 12) for _ in range(6)]
    pays = [pay_case(rnd) for _ in range(24)]
    print(json.dumps({"step": steps, "pay": pays}, indent=1))


if __name__ == "__main__":
    main()
