import React from "react";
import { clone, each, isFunction } from "lodash";
import InspireTree from "inspire-tree";
import classlist from "../lib/classlist";
import List from "./List"; // eslint-disable-line
import ToggleAnchor from "./ToggleAnchor";
import NodeAnchor from "./NodeAnchor";
import EmptyList from "./EmptyList";
import Checkbox from "./Checkbox";
import EditToolbar from "./EditToolbar";

export default class ListItem extends React.Component {
    constructor(props) {
        super(props);

        this.state = this.stateFromNode(props.node);

        this.getClassNames = this.getClassNames.bind(this);
        this.renderCheckbox = this.renderCheckbox.bind(this);
        this.renderChildren = this.renderChildren.bind(this);
        this.renderToggle = this.renderToggle.bind(this);

        this.onDragStart = this.onDragStart.bind(this);
        this.onDragEnd = this.onDragEnd.bind(this);
        this.onDragEnter = this.onDragEnter.bind(this);
        this.onDragLeave = this.onDragLeave.bind(this);
        this.onDragOver = this.onDragOver.bind(this);
        this.onDrop = this.onDrop.bind(this);
        this.unhighlightTarget = this.unhighlightTarget.bind(this);
        this.renderEditToolbar = this.renderEditToolbar.bind(this);
    }

    stateFromNode(node) {
        return { dirty: node.itree.dirty };
    }

    getClassNames() {
        const node = this.props.node;
        const state = node.itree.state;
        // const attributes = node.itree.li.attributes;

        // Set state classnames
        const classNames = classlist(node);

        Object.keys(state).forEach(key => {
            if (state[key]) classNames.push(key);
        });

        // Inverse and additional classes
        if (!node.hidden() && node.removed()) {
            classNames.push("hidden");
        }

        if (node.expanded()) {
            classNames.push("expanded");
        }

        classNames.push(node.hasOrWillHaveChildren() ? "folder" : "leaf");

        // // Append any custom class names
        // let customClasses = attributes.class || attributes.className;
        // if (isFunction(customClasses)) {
        //   customClasses = customClasses(node);
        // }
        //
        // if (!isEmpty(customClasses)) {
        //   if (isString(customClasses)) {
        //     // Support periods for backwards compat with hyperscript-formatted classes
        //     classNames = classNames.concat(customClasses.split(/[\s\.]+/)); // eslint-disable-line
        //   } else if (Array.isArray(customClasses)) {
        //     classNames = classNames.concat(customClasses);
        //   }
        // }

        return classNames.join(" ");
    }

    getAttributes() {
        const node = this.props.node;
        const attributes = clone(node.itree.li.attributes) || {};
        attributes.className = this.getClassNames();

        // Force internal-use attributes
        attributes["data-uid"] = node.id;

        // Allow drag and drop?
        if (this.props.dom.config.dragAndDrop.enabled) {
            attributes.draggable = node.state("draggable");
            attributes.onDragEnd = this.onDragEnd.bind(this);
            attributes.onDragEnter = this.onDragEnter.bind(this);
            attributes.onDragLeave = this.onDragLeave.bind(this);
            attributes.onDragStart = this.onDragStart.bind(this);

            // Are we a valid drop target?
            if (node.state("drop-target")) {
                attributes.onDragOver = this.onDragOver.bind(this);
                attributes.onDrop = this.onDrop.bind(this);
            } else {
                // Setting to null forces removal of prior listeners
                attributes.onDragOver = null;
                attributes.onDrop = null;
            }
        }

        return attributes;
    }

    getTargetDirection(event, elem) {
        const clientY = event.clientY;
        const targetRect = elem.getBoundingClientRect();

        const yThresholdForAbove = targetRect.top + targetRect.height / 3;
        const yThresholdForBelow = targetRect.bottom - targetRect.height / 3;

        let dir = 0;

        if (clientY <= yThresholdForAbove) {
            dir = -1;
        } else if (clientY >= yThresholdForBelow) {
            dir = 1;
        }

        return dir;
    }

    onDragStart(event) {
        event.stopPropagation();

        event.dataTransfer.effectAllowed = "move"; // eslint-disable-line
        event.dataTransfer.dropEffect = "move"; // eslint-disable-line

        const node = this.props.node;

        // Due to "protected" mode we can't access any DataTransfer data
        // during the dragover event, yet we still need to validate this node with the target
        this.props.dom._activeDragNode = node;

        event.dataTransfer.setData("treeId", node.tree().id);
        event.dataTransfer.setData("nodeId", node.id);

        // Disable self and children as drop targets
        node.state("drop-target", false);

        if (node.hasChildren()) {
            node.children.stateDeep("drop-target", false);
        }

        // If we should validate all nodes as potential drop targets on drag start
        if (this.props.dom.config.dragAndDrop.validateOn === "dragstart") {
            const validator = this.props.dom.config.dragAndDrop.validate;
            const validateCallable = isFunction(validator);

            // Validate with a custom recursor because a return of "false"
            // should mean "do not descend" rather than "stop iterating"
            const recursor = function (obj, iteratee) {
                // eslint-disable-line
                if (InspireTree.isTreeNodes(obj)) {
                    each(obj, n => {
                        recursor(n, iteratee);
                    });
                } else if (InspireTree.isTreeNode(obj)) {
                    if (iteratee(obj) !== false && obj.hasChildren()) {
                        recursor(obj.children, iteratee);
                    }
                }
            };

            this.props.dom._tree.batch();

            recursor(this.props.dom._tree.model, n => {
                let valid = n.id !== node.id;

                // Ensure target node isn't a descendant
                if (valid) {
                    valid = !n.hasAncestor(node);
                }

                // If still valid and user has additional validation...
                if (valid && validateCallable) {
                    valid = validator(node, n);
                }

                // Set state
                n.state("drop-target", valid);

                return valid;
            });

            this.props.dom._tree.end();
        }

        event.persist();
        this.props.dom._tree.emit("node.dragstart", event);
    }

    onDragEnd(event) {
        event.preventDefault();
        event.stopPropagation();

        this.unhighlightTarget();

        event.persist();
        this.props.dom._tree.emit("node.dragend", event);
    }

    onDragEnter(event) {
        event.preventDefault();
        event.stopPropagation();

        // Nodes already within parents don't trigger enter/leave events on their ancestors
        this.props.node.recurseUp(this.unhighlightTarget);

        // Set drag target state
        this.props.node.state("drag-targeting", true);

        event.persist();
        this.props.dom._tree.emit("node.dragenter", event);
    }

    onDragLeave(event) {
        event.preventDefault();
        event.stopPropagation();

        this.unhighlightTarget();

        event.persist();
        this.props.dom._tree.emit("node.dragleave", event);
    }

    onDragOver(event) {
        event.preventDefault();
        event.stopPropagation();

        const dragNode = this.props.dom._activeDragNode;
        const node = this.props.node;

        // Event.target doesn't always match the element we need to calculate
        const dir = this.getTargetDirection(
            event,
            node.itree.ref.querySelector("a")
        );

        if (this.props.dom.config.dragAndDrop.validateOn === "dragover") {
            // Validate drop target
            const validator = this.props.dom.config.dragAndDrop.validate;
            const validateCallable = isFunction(validator);

            let valid = dragNode.id !== node.id;

            if (valid) {
                valid = !node.hasAncestor(dragNode);
            }

            if (valid && validateCallable) {
                valid = validator(dragNode, node, dir);
            }

            // Set state
            node.state("drop-target", valid);
            this.props.dom._tree.applyChanges();

            if (!valid) {
                return;
            }
        }

        // Set drag target states
        this.props.dom._tree.batch();
        node.state("drag-targeting", true);
        node.state("drag-targeting-above", dir === -1);
        node.state("drag-targeting-below", dir === 1);
        node.state("drag-targeting-insert", dir === 0);
        this.props.dom._tree.end();

        event.persist();
        this.props.dom._tree.emit("node.dragover", event, dir);
    }

    onDrop(event) {
        event.preventDefault();
        event.stopPropagation();

        // Always unhighlight target
        this.unhighlightTarget();

        // Get the data from our transfer
        const treeId = event.dataTransfer.getData("treeId");
        const nodeId = event.dataTransfer.getData("nodeId");

        // Find the drop target
        const targetNode = this.props.node;

        // Clear cache
        this.props.dom._activeDragNode = null;

        // Determine the insert direction (calc before removing source node, which modifies the DOM)
        const dir = this.getTargetDirection(event, event.target);

        let sourceTree;
        if (treeId === this.props.dom._tree.id) {
            sourceTree = this.props.dom._tree;
        } else if (treeId) {
            sourceTree = document.querySelector(`[data-uid="${treeId}"]`)
                .inspireTree;
        }

        // Only source/handle node if it's a node that was dropped
        let newNode;
        let newIndex;
        if (sourceTree) {
            const node = sourceTree.node(nodeId);
            node.state("drop-target", true);

            const exported = node.remove(true);

            // Get the index of the target node
            let targetIndex = targetNode.context().indexOf(targetNode);

            if (dir === 0) {
                // Add as a child
                newNode = targetNode.addChild(exported);

                // Cache the new index
                newIndex = targetNode.children.indexOf(newNode);

                // Auto-expand
                targetNode.expand();
            } else {
                // Determine the new index
                newIndex = dir === 1 ? ++targetIndex : targetIndex;

                // Insert and cache the node
                newNode = targetNode.context().insertAt(newIndex, exported);
            }
        }

        event.persist();
        this.props.dom._tree.emit(
            "node.drop",
            event,
            newNode,
            targetNode,
            newIndex
        );
    }

    unhighlightTarget(node) {
        (node || this.props.node).states(
            [
                "drag-targeting",
                "drag-targeting-above",
                "drag-targeting-below",
                "drag-targeting-insert",
            ],
            false
        );
    }

    renderCheckbox() {
        const { node, dom } = this.props;

        if (dom.config.showCheckboxes) {
            return (
                <Checkbox
                    checked={node.checked()}
                    dom={dom}
                    indeterminate={node.indeterminate()}
                    node={node}
                />
            );
        }
    }

    renderChildren() {
        const { node, dom } = this.props;

        if (node.hasChildren()) {
            const nodes = node.children;
            const loading = dom.loading;
            const pagination = nodes.pagination();

            return (
                <List
                    context={node}
                    dom={dom}
                    limit={pagination.limit}
                    loading={loading}
                    nodes={nodes}
                    total={pagination.total}
                />
            );
        }

        if (dom.isDynamic && node.children) {
            if (!node.hasLoadedChildren()) {
                return <EmptyList text="Loading..." />;
            }
            return <EmptyList text="No Results" />;
        }
    }

    renderEditToolbar() {
        // @todo fix this boolean
        const { node, dom } = this.props;
        if (dom._tree.config.editing.edit && !node.editing()) {
            return <EditToolbar dom={dom} node={node} />;
        }
    }

    renderToggle() {
        const { node, dom } = this.props;
        const hasVisibleChildren = !dom.isDynamic
            ? node.hasVisibleChildren()
            : Boolean(node.children);
        if (hasVisibleChildren) {
            return <ToggleAnchor collapsed={node.collapsed()} node={node} />;
        }
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.stateFromNode(nextProps.node));
    }

    shouldComponentUpdate(nextProps, nextState) {
        return nextState.dirty;
    }

    render() {
        const { node, dom } = this.props;
        const li = (
            <li
                {...this.getAttributes()}
                ref={domNode =>
                    (this.node = this.props.node.itree.ref = domNode)
                } // eslint-disable-line
            >
                {this.renderEditToolbar()}
                <div className="title-wrap">
                    {this.renderToggle()}
                    {this.renderCheckbox()}
                    <NodeAnchor
                        dom={dom}
                        editing={node.editing()}
                        expanded={node.expanded()}
                        hasOrWillHaveChildren={node.hasOrWillHaveChildren()}
                        node={node}
                        text={node.text}
                    />
                </div>
                <div className="wholerow" />
                {this.renderChildren()}
            </li>
        );

        // Clear dirty bool only after everything has been generated (and states set)
        node.state("rendered", true);
        node.itree.dirty = false;

        return li;
    }
}
