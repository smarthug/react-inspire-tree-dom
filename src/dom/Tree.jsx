import React from "react";
import blankNode from "../lib/blank-node";
import List from "./List";
import Table from "./Table";

export default class Tree extends React.Component {
    constructor(props) {
        super(props);

        this.add = this.add.bind(this);
        this.renderAddLink = this.renderAddLink.bind(this);
    }

    add() {
        this.props.dom._tree.focused().blur();
        this.props.dom._tree.addNode(blankNode());
    }

    renderAddLink() {
        if (this.props.dom._tree.config.editing.add) {
            return (
                <li>
                    <a
                        className="btn ins-icon icon-plus"
                        onClick={this.add.bind(this)}
                        title="Add a new root node"></a>
                </li>
            );
        }
    }

    render() {
        const { dom, nodes } = this.props;
        const loading = dom.loading;
        const pagination = nodes.pagination();
        const hasColumns = Array.isArray(dom.config.columns);

        return hasColumns ? (
            <Table
                dom={dom}
                limit={pagination.limit}
                loading={loading}
                nodes={nodes}
                total={pagination.total}
                isFirstRender={true}
            />
        ) : (
            <List
                dom={dom}
                limit={pagination.limit}
                loading={loading}
                nodes={nodes}
                total={pagination.total}
                isFirstRender={true}>
                {this.renderAddLink()}
            </List>
        );
    }
}
