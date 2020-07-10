import React from "react";
import blankNode from "../lib/blank-node";

export default class EditToolbar extends React.Component {
    constructor(props) {
        super(props);

        this.add = this.add.bind(this);
        this.edit = this.edit.bind(this);
        this.remove = this.remove.bind(this);
    }

    add(event) {
        event.stopPropagation();

        this.props.node.addChild(blankNode());
        this.props.node.expand();
    }

    edit(event) {
        event.stopPropagation();

        this.props.node.toggleEditing();
    }

    remove(event) {
        event.stopPropagation();

        this.props.node.remove();
    }

    shouldComponentUpdate() {
        return false;
    }

    render() {
        const { node, dom } = this.props;
        const buttons = [];

        if (dom._tree.config.editing.edit) {
            buttons.push(
                <a
                    className="btn ins-icon icon-pencil"
                    onClick={this.edit}
                    title="Edit this node"
                    key={`${node.id}-edit`}></a>
            );
        }

        if (dom._tree.config.editing.add) {
            buttons.push(
                <a
                    className="btn ins-icon icon-plus"
                    onClick={this.add}
                    title="Add a child node"
                    key={`${node.id}-add`}></a>
            );
        }

        if (dom._tree.config.editing.remove) {
            buttons.push(
                <a
                    className="btn ins-icon icon-minus"
                    onClick={this.remove}
                    title="Remove this node"
                    key={`${node.id}-remove`}></a>
            );
        }

        return <span className="btn-group">{buttons}</span>;
    }
}
