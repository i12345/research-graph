import { ObservableList, ObservableListProtocols } from "./observable-list.js"
import test from "ava"

test("insert", t => {
    const list = new ObservableList<string>()
    
    const words = ["keyboard", "mouse", "display"]
    t.plan(words.length)

    let itemInserted = ""
    const responder: ObservableListProtocols<string>["insert"] = (item) => t.is(item, itemInserted)
    
    list.on("insert", responder)
    
    list.push(itemInserted = words[0]!)
    list.push(itemInserted = words[1]!)

    list.off("insert", responder)

    list.push("unrelated")

    list.on("insert", responder)

    list.push(itemInserted = words[2]!)
})
