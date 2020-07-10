import React from "react";

class Checkbox extends React.Component {
    constructor(props) {
        super(props);
        this.click = this.click.bind(this);
    }

    click(event) {
        // Define our default handler
        const handler = () => {
            this.props.node.toggleCheck();
        };

        event.persist();
        // Emit an event with our forwarded MouseEvent, node, and default handler
        this.props.dom._tree.emit(
            "node.click",
            event,
            this.props.node,
            handler
        );

        // Unless default is prevented, auto call our default handler
        if (!event.treeDefaultPrevented) {
            handler();
        }
    }

    componentDidMount() {
        this.el.indeterminate = this.props.indeterminate;
    }

    componentDidUpdate(prevProps) {
        if (prevProps.indeterminate !== this.props.indeterminate) {
            this.el.indeterminate = this.props.indeterminate;
        }
    }

    render() {
        const { node } = this.props;
        return (
            <input
                ref={el => {
                    this.el = el;
                }}
                type="checkbox"
                checked={node.checked()}
                onClick={this.click}
            />
        );
    }
}

export default Checkbox;
