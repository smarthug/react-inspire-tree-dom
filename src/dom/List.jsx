import React from "react";
import { find } from "lodash";
import stateComparator from "../lib/state-comparator";
import ListItem from "./ListItem"; // eslint-disable-line

export default class List extends React.Component {
    constructor() {
        super();

        this.isDeferred = this.isDeferred.bind(this);
        this.loadMore = this.loadMore.bind(this);
    }

    isDeferred() {
        return (
            this.props.dom.config.deferredRendering ||
            this.props.dom._tree.config.deferredLoading
        );
    }

    loadMore(event) {
        event.preventDefault();
        if (this.props.context) {
            this.props.context.loadMore(event);
        } else {
            this.props.dom._tree.loadMore(event);
        }
    }

    renderLoadMoreNode() {
        return (
            <li className="leaf detached">
                <a
                    className="title ins-icon icon-more load-more"
                    onClick={this.loadMore.bind(this)}>
                    Load More
                </a>
            </li>
        );
    }

    renderLoadingTextNode() {
        return (
            <li className="leaf">
                <span className="title ins-icon icon-more">Loading...</span>
            </li>
        );
    }

    shouldComponentUpdate(nextProps) {
        return (
            find(nextProps.nodes, "itree.dirty") ||
            stateComparator(this.props, nextProps)
        );
    }

    render() {
        let renderNodes = this.props.nodes;
        const pagination = renderNodes.pagination();

        // If rendering deferred, chunk the nodes client-side
        if (this.props.dom.config.deferredRendering) {
            // Filter non-hidden/removed nodes and limit by this context's pagination
            let count = 0;
            renderNodes = this.props.nodes.filter(n => {
                const matches = !(n.hidden() || n.removed());
                if (matches) {
                    count++;
                }
                return count <= pagination.limit && matches;
            });
        }

        // Render nodes as list items
        const items = renderNodes.map(node => (
            <ListItem dom={this.props.dom} key={node.id} node={node} />
        ));

        if (this.isDeferred() && pagination.limit < pagination.total) {
            if (!this.props.loading) {
                items.push(this.renderLoadMoreNode());
            } else {
                items.push(this.renderLoadingTextNode());
            }
        }

        return (
            <ol className="tree-list">
                {items}
                {this.props.children}
            </ol>
        );
    }
}
