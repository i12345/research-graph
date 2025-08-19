# research graph

Research include deep questions, creative and recursive. Source material, questions, and answers form a graph relationship. Research graph is designed to organize these research relationships.

## graph model

Initially, it is just a graph with nodes and directed relationships. Nodes could be text, file, chart, and other types. Users can click anywhere to make a new text node appear in edit mode. Users can drag and drop a file to put a node for it in the graph. Nodes can have permissions for users/groups permitted to edit.

Selection-based nodes are based on a source node with some selection range. When a range of text is selected in a text node, a button appears to the side of the node to make a selection node. A relationship with the selection range for its relation is directed from the source node to the selection node. When the source node is updated, the selected range is made to update its start and end locations, and the selection node is updated with contents of the selection.

A relationship can be presented in regular directed graph arrow with the relation on its path. It can also be presented as just a header above the target node with the relation text and a button to hyperlink to the source node.

## node types

Text nodes have corresponding audio. When a text-node is selected, a button appears to play the audio for the node. If a range of text is selected in the text node, clicking the button only plays audio for that range. Text nodes can be made by recording audio and the audio is converted to text.

Image nodes (file nodes of images) can have a rectangular selection made for a selection node. When the application runs in desktop mode, it observes application windows open on the computer to suggest pasting any of those as a screenshot into the graph.
