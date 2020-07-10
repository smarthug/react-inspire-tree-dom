import React from "react";
import { isFunction, isEmpty, isString, clone } from "lodash";
import ToggleAnchor from "./ToggleAnchor";
import NodeAnchor from "./NodeAnchor";

class Table extends React.Component {
    constructor() {
        super();

        this.renderThead = this.renderThead.bind(this);
        this.renderTbody = this.renderTbody.bind(this);
        this.getClassNames = this.getClassNames.bind(this);
        this.renderToggle = this.renderToggle.bind(this);
    }

    getClassNames(node) {
        const state = node.itree.state;
        const attributes = node.itree.li.attributes;

        // Set state classnames
        let classNames = [];
        Object.keys(state).forEach(key => {
            if (state[key]) classNames.push(key);
        });

        // Inverse and additional classes
        if (!node.hidden() && node.removed()) {
            classNames.push("hidden");
        }
        if (node.getParent() && node.getParent().expanded()) {
            classNames.push("is-show");
        } else if (node.getParent()) {
            classNames.push("is-hidden");
        }

        if (node.expanded()) {
            classNames.push("expanded");
        }

        classNames.push(node.hasOrWillHaveChildren() ? "folder" : "leaf");

        // Append any custom class names
        let customClasses = attributes.class || attributes.className;
        if (isFunction(customClasses)) {
            customClasses = customClasses(node);
        }

        if (!isEmpty(customClasses)) {
            if (isString(customClasses)) {
                // Support periods for backwards compat with hyperscript-formatted classes
                classNames = classNames.concat(customClasses.split(/[\s\.]+/)); // eslint-disable-line
            } else if (Array.isArray(customClasses)) {
                classNames = classNames.concat(customClasses);
            }
        }

        return classNames.join(" ");
    }

    getAttributes(node) {
        const attributes = clone(node.itree.li.attributes) || {};
        attributes.className = this.getClassNames(node);

        // Force internal-use attributes
        attributes["data-uid"] = node.id;

        return attributes;
    }

    renderToggle(node) {
        const { dom } = this.props;
        const hasVisibleChildren = !dom.isDynamic
            ? node.hasVisibleChildren()
            : Boolean(node.children);
        if (hasVisibleChildren) {
            return (
                <ToggleAnchor
                    collapsed={node.collapsed()}
                    node={node}
                    hiddenDeep
                />
            );
        }
        return <span className="space-holder"></span>;
    }

    renderThead() {
        const { dom } = this.props;
        const thead = dom.config.columns.map((item, index) => (
            <th
                key={item.field || `tree-table-${index}`}
                className="tree-column">
                {item.label}
            </th>
        ));

        return (
            <thead>
                <tr>{thead}</tr>
            </thead>
        );
    }

    renderTbody(nodes) {
        const { dom } = this.props;
        const columns = dom.config.columns;
        const items = nodes.map(node => (
            <tr // eslint-disable-line
                key={node.id}
                {...this.getAttributes(node)}
                ref={domNode => {
                    node.itree.ref = domNode;
                }} // eslint-disable-line
            >
                {columns.map((item, index) => {
                    const key = `${item.field || index}-${node.id}`;
                    if (index) {
                        const content = isFunction(item.template)
                            ? item.template(node)
                            : node[item.field];
                        return <td key={key}>{content}</td>;
                    }
                    const layer = node.getTextualHierarchy().length - 1;
                    return (
                        <td key={key}>
                            {layer ? (
                                <span
                                    className={`space-holder space-${layer}x`}></span>
                            ) : null}
                            {this.renderToggle(node)}
                            <NodeAnchor
                                dom={dom}
                                editing={node.editing()}
                                expanded={node.expanded()}
                                hasOrWillHaveChildren={node.hasOrWillHaveChildren()}
                                node={node}
                                text={node.text}
                            />
                        </td>
                    );
                })}
            </tr>
        ));

        return <tbody>{items}</tbody>;
    }

    flattenDeep(array, depth, predicate, isStrict, result = []) {
        let index = -1;
        const length = array.length;
        predicate || (predicate = this.isFlattenable); // eslint-disable-line
        // result || (result = []);

        while (++index < length) {
            const value = array[index];
            if (depth > 0 && predicate(value.children)) {
                if (depth > 1) {
                    result.push(value);
                    // Recursively flatten arrays (susceptible to call stack limits).
                    this.flattenDeep(
                        value.children,
                        depth - 1,
                        predicate,
                        isStrict,
                        result
                    );
                } else {
                    // arrayPush(result, value);
                    result.push(value);
                }
            } else if (!isStrict) {
                result[result.length] = value; // eslint-disable-line
            }
        }
        return result;
    }

    isFlattenable(value) {
        return value && value.length;
    }

    render() {
        const { dom, nodes } = this.props;
        let renderNodes = nodes;
        const pagination = renderNodes.pagination();

        // If rendering deferred, chunk the nodes client-side
        if (dom.config.deferredRendering) {
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

        const flattedNodes = this.flattenDeep(renderNodes, Infinity);

        return (
            <table className="table data-table tree-table">
                {this.renderThead()}
                {this.renderTbody(flattedNodes)}
            </table>
        );
    }
}

export default Table;
