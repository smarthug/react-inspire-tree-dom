import React from "react";
import EditForm from "./EditForm";

class NodeAnchor extends React.Component {
    constructor() {
        super();

        this.blur = this.blur.bind(this);
        this.click = this.click.bind(this);
        this.contextMenu = this.contextMenu.bind(this);
        this.dblclick = this.dblclick.bind(this);
        this.focus = this.focus.bind(this);
        this.mousedown = this.mousedown.bind(this);
    }

    blur() {
        this.props.node.blur();
    }

    click(event) {
        const { node, dom } = this.props;

        const handler = () => {
            event.preventDefault();
            if (this.props.editing) return;

            if (event.metaKey || event.ctrlKey || event.shiftKey) {
                dom._tree.disableDeselection();
            }

            if (event.shiftKey) {
                dom.clearSelection();

                const selected = dom._tree.lastSelectedNode();
                if (selected) {
                    dom._tree.selectBetween.apply(
                        dom._tree,
                        dom._tree.boundingNodes(selected, node)
                    ); // eslint-disable-line
                }
            }

            if (node.selected()) {
                if (!dom._tree.config.selection.disableDirectDeselection) {
                    node.deselect();
                }
            } else {
                node.select();
            }

            dom._tree.enableDeselection();
        };

        event.persist();
        // Emit an event with our forwarded MouseEvent, node, and default handler
        dom._tree.emit("node.click", event, node, handler);
        // Unless default is prevented, auto call our default handler
        if (!event.treeDefaultPrevented) {
            handler();
        }
    }

    contextMenu(event) {
        const { node, dom } = this.props;
        event.persist();
        dom._tree.emit("node.contextmenu", event, node);
    }

    dblclick(event) {
        const { node, dom } = this.props;
        // Define our default handler
        const handler = () => {
            // Clear text selection which occurs on double click
            dom.clearSelection();
            node.toggleCollapse();
        };

        event.persist();
        // Emit an event with our forwarded MouseEvent, node, and default handler
        dom._tree.emit("node.dblclick", event, node, handler);

        // Unless default is prevented, auto call our default handler
        if (!event.treeDefaultPrevented) {
            handler();
        }
    }

    focus(event) {
        this.props.node.focus(event);
    }

    mousedown() {
        if (this.props.dom.isDragDropEnabled) {
            this.props.dom.isMouseHeld = true;
        }
    }

    render() {
        const { node, dom, expanded, hasOrWillHaveChildren } = this.props;
        const attributes = node.itree.a.attributes || {};
        attributes.className = "node ins-icon";
        attributes.tabIndex = 1;
        attributes.unselectable = "on";

        if (!dom.config.showCheckboxes) {
            const folderIcon = expanded ? "icon-folder-open" : "icon-folder";
            const nodeIcon =
                node.itree.icon ||
                (hasOrWillHaveChildren ? folderIcon : "icon-file-empty");
            attributes.className = `${attributes.className} ${nodeIcon}`;
        } else {
            attributes.className = `${attributes.className} icon-placeholder`;
        }

        let content = node.text;
        if (node.editing()) {
            content = <EditForm dom={this.props.dom} node={this.props.node} />;
        }

        return (
            <a
                data-uid={node.id}
                onBlur={this.blur}
                onClick={this.click}
                onContextMenu={this.contextMenu}
                onDoubleClick={this.dblclick}
                onFocus={this.focus}
                onMouseDown={this.mousedown}
                {...attributes}>
                {content}
            </a>
        );
    }
}

export default NodeAnchor;
