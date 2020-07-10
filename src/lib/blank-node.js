/**
 * Helper method to create an object for a new node.
 *
 * @private
 * @return {}
 */
export default function blankNode() {
    return {
        text: "New Node",
        itree: {
            state: {
                editing: true,
                focused: true,
            },
        },
    };
}
