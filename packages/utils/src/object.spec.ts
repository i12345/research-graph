import test from "ava"
import { replaceProperty } from "./object.js"

test("replace", t => {
    interface A {
        i: number
        b: B
    }
    
    interface B {
        j: number
        c: C
    }

    interface C {
        k: number
    }

    const a0: A = {
        i: 0,
        b: {
            j: 0,
            c: {
                k: 0
            },
        }
    }

    t.is(a0.i, 0)

    const a1 = replaceProperty(a0, ["i"], 1)

    t.is(a0.i, 0)
    t.is(a1.i, 1)

    a0.b.j++
    t.is(a0.b.j, 1)
    t.is(a1.b.j, 1)
})
