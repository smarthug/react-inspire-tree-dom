import React from "react";
import ReactDOM from "react-dom";
import * as _ from "lodash";
// import InspireTree from 'inspire-tree';
// import InspireTree from "inspire-tree/dist/inspire-tree";
import * as keys from "./lib/keycodes";
import Tree from "./dom/Tree";
// import './scss/tree.scss';
import "./index.css";
// import 'inspire-tree-dom/dist/inspire-tree-light.css';
//import './inspire-tree-dom.css';
// import './inspire-tree-dom.css';

/**
 * Default InspireTree rendering logic.
 *
 * @category DOM
 * @return {InspireDOM} Default renderer.
 */
export  class InspireTreeDOM extends React.Component {
    constructor(tree, opts) {
        super();

        // if (!(tree instanceof InspireTree)) {
        //     throw new TypeError(
        //         "Tree argument is not an InspireTree instance."
        //     );
        // }

        // Init properties
        this._tree = tree;
        this.batching = 0;
        this.dropTargets = [];
        this.$scrollLayer = {};

        if (!opts.target) {
            throw new TypeError(
                "Invalid `target` property - must be a selector, HTMLElement, or jQuery element."
            );
        }

        // Let InspireTree know we're in control of a node's `rendered` state
        tree.usesNativeDOM = true; // eslint-disable-line

        const dndDefaults = {
            enabled: false,
            validateOn: "dragstart",
            validate: null,
        };

        // Assign defaults
        this.config = _.defaultsDeep({}, opts, {
            autoLoadMore: true,
            deferredRendering: false,
            dragAndDrop: dndDefaults,
            nodeHeight: 25,
            showCheckboxes: false,
            tabindex: -1,
            target: false,
        });
        console.log(this.config);

        if (opts.dragAndDrop === true) {
            this.config.dragAndDrop = dndDefaults;
            this.config.dragAndDrop.enabled = true;
        }

        // If user didn't specify showCheckboxes,
        // but is using checkbox selection mode,
        // enable it automatically.
        if (
            tree.config.selection.mode === "checkbox" &&
            !_.isBoolean(_.get(opts, "showCheckboxes"))
        ) {
            this.config.showCheckboxes = true;
        }

        // Cache because we use in loops
        this.isDynamic = _.isFunction(this._tree.config.data);

        // Connect to our target DOM element
        this.attach(this.config.target);

        let initialRender = true;

        // Apply changes
        tree.on("changes.applied", () => {
            this.renderNodes();

            if (initialRender) {
                this.scrollSelectedIntoView();

                initialRender = false;
            }
        });

        // Immediately render, just in case any already exists
        this.renderNodes();
    }

    /**
     * Attaches to the DOM element for rendering.
     *
     * @category DOM
     * @private
     * @param {HTMLElement} target Element, selector, or jQuery-like object.
     * @return {void}
     */
    attach(target) {
        console.log(this._tree);
        this.$target = this.getElement(target);
        this.$scrollLayer = this.getScrollableAncestor(this.$target);

        if (!this.$target) {
            throw new Error("No valid element to attach to.");
        }

        this.$target.setAttribute("data-uid", this._tree.id);

        // Set classnames
        const classNames = this.$target.className.split(" ");
        classNames.push("inspire-tree");
        classNames.push("tree-wrap");

        if (this.config.editable) {
            classNames.push("editable");

            _.each(
                _.pickBy(this._tree.config.editing, _.identity),
                (v, key) => {
                    console.log(v, key);
                    classNames.push(`editable-${key}`);
                }
            );
        }

        this.$target.className = classNames.join(" ");
        this.$target.setAttribute("tabindex", this.config.tabindex || 0);

        // Handle keyboard interaction
        this.$target.addEventListener(
            "keydown",
            this.keyboardListener.bind(this)
        );

        // Drag and drop listeners
        if (this.config.dragAndDrop.enabled) {
            this.$target.addEventListener(
                "dragenter",
                this.onDragEnter.bind(this),
                false
            );
            this.$target.addEventListener(
                "dragleave",
                this.onDragLeave.bind(this),
                false
            );
            this.$target.addEventListener(
                "dragover",
                this.onDragOver.bind(this),
                false
            );
            this.$target.addEventListener(
                "drop",
                this.onDrop.bind(this),
                false
            );

            this.$target.classList.add("drag-and-drop");
        }

        // Sync browser focus to focus state
        this._tree.on("node.focused", node => {
            const elem = node.itree.ref.querySelector(".node");
            if (elem !== document.activeElement) {
                elem.focus();
            }
        });

        if (
            this.config.deferredRendering ||
            this._tree.config.deferredLoading
        ) {
            // Force valid pagination limit based on viewport
            const { limit } = this._tree.config.pagination;
            this._tree.config.pagination.limit =
                limit > 0
                    ? limit
                    : _.ceil(
                          this.$scrollLayer.clientHeight /
                              this.config.nodeHeight
                      );

            // Listen for scrolls for automatic loading
            if (this.config.autoLoadMore) {
                this.$target.addEventListener(
                    "scroll",
                    _.throttle(this.scrollListener.bind(this), 20)
                );
            }
        }

        this.$target.inspireTree = this._tree;
    }

    /**
     * Clear page text selection, primarily after a click event which
     * natively selects a range of text.
     *
     * @category DOM
     * @private
     * @return {void}
     */
    clearSelection() {
        if (document.selection && document.selection.empty) {
            document.selection.empty();
        } else if (window.getSelection) {
            window.getSelection().removeAllRanges();
        }
    }

    /**
     * Get an HTMLElement through various means:
     * An element, jquery object, or a selector.
     *
     * @category DOM
     * @private
     * @param {mixed} target Element, jQuery selector, selector.
     * @return {HTMLElement} Matching element.
     */
    getElement(target) {
        let $element;

        if (target instanceof HTMLElement) {
            $element = target;
        } else if (_.isObject(target) && _.isObject(target[0])) {
            $element = target[0];
        } else if (_.isString(target)) {
            const match = document.querySelector(target);
            if (match) {
                $element = match;
            }
        }

        return $element;
    }

    /**
     * Helper method to find a scrollable ancestor element.
     *
     * @category DOM
     * @private
     * @param {HTMLElement} $element Starting element.
     * @return {HTMLElement} Scrollable element.
     */
    getScrollableAncestor($element) {
        if ($element instanceof Element) {
            const style = getComputedStyle($element);
            if (style.overflow !== "auto" && $element.parentNode) {
                $element = this.getScrollableAncestor($element.parentNode); // eslint-disable-line
            }
        }

        return $element;
    }

    /**
     * Get a tree instance based on an ID.
     *
     * @category DOM
     * @param {string} id Tree ID.
     * @return {InspireTree} Tree instance.
     */
    static getTreeById(id) {
        // const element = document.querySelector('[data-uid="' + id + '"]');
        const element = document.querySelector(`[data-uid="${id}"]`);
        if (element) {
            return element.inspireTree;
        }
    }

    /**
     * Listen to keyboard event for navigation.
     *
     * @category DOM
     * @private
     * @param {Event} event Keyboard event.
     * @return {void}
     */
    keyboardListener(event) {
        event.stopPropagation();

        // Ignore keys we won't care for.
        // For example, this avoids trampling cmd+reload
        if (
            [
                keys.DOWN_ARROW,
                keys.ENTER,
                keys.LEFT_ARROW,
                keys.RIGHT_ARROW,
                keys.UP_ARROW,
            ].indexOf(event.which) < 0
        ) {
            return;
        }

        // Navigation
        const focusedNodes = this._tree.focused();
        if (focusedNodes.length) {
            event.preventDefault();

            switch (event.which) {
                case keys.DOWN_ARROW:
                    this.moveFocusDownFrom(focusedNodes[0]);
                    break;
                case keys.ENTER:
                    focusedNodes[0].toggleSelect();
                    break;
                case keys.LEFT_ARROW:
                    focusedNodes[0].collapse();
                    break;
                case keys.RIGHT_ARROW:
                    focusedNodes[0].expand();
                    break;
                case keys.UP_ARROW:
                    this.moveFocusUpFrom(focusedNodes[0]);
                    break;
                default:
            }
        }
    }

    /**
     * Move select down the visible tree from a starting node.
     *
     * @category DOM
     * @private
     * @param {object} startingNode Node object.
     * @return {void}
     */
    moveFocusDownFrom(startingNode) {
        const next = startingNode.nextVisibleNode();
        if (next) {
            next.focus();
        }
    }

    /**
     * Move select up the visible tree from a starting node.
     *
     * @category DOM
     * @private
     * @param {object} startingNode Node object.
     * @return {void}
     */
    moveFocusUpFrom(startingNode) {
        const prev = startingNode.previousVisibleNode();
        if (prev) {
            prev.focus();
        }
    }

    /**
     * Helper method for obtaining the data-uid from a DOM element.
     *
     * @category DOM
     * @private
     * @param {HTMLElement} element HTML Element.
     * @return {object} Node object
     */
    nodeFromTitleDOMElement(element) {
        const uid = element.parentNode.parentNode.getAttribute("data-uid");
        return this._tree.node(uid);
    }

    /**
     * Drag enter listener.
     *
     * @category DOM
     * @private
     * @param {DragEvent} event Drag enter.
     * @return {void}
     */
    onDragEnter(event) {
        event.preventDefault();

        event.target.classList.add("drag-targeting", "drag-targeting-insert");
    }

    /**
     * Drag leave listener.
     *
     * @category DOM
     * @private
     * @param {DragEvent} event Drag leave.
     * @return {void}
     */
    onDragLeave(event) {
        event.preventDefault();

        this.unhighlightTarget(event.target);
    }

    /**
     * Drag over listener.
     *
     * @category DOM
     * @private
     * @param {DragEvent} event Drag over.
     * @return {void}
     */
    onDragOver(event) {
        event.preventDefault();
    }

    /**
     * Drop listener.
     *
     * @category DOM
     * @private
     * @param {DragEvent} event Dropped.
     * @return {void}
     */
    onDrop(event) {
        event.preventDefault();

        this.unhighlightTarget(event.target);

        const treeId = event.dataTransfer.getData("treeId");
        const nodeId = event.dataTransfer.getData("nodeId");

        // Find the tree
        const tree = InspireTreeDOM.getTreeById(treeId);
        const node = tree.node(nodeId);

        node.state("drop-target", true);

        // Remove the node from its previous context
        const exported = node.remove(true);

        // Add the node to this tree/level
        const newNode = this._tree.addNode(exported);
        const newIndex = this._tree.indexOf(newNode);

        this._tree.emit("node.drop", event, newNode, null, newIndex);
    }

    /**
     * Triggers rendering for the given node array.
     *
     * @category DOM
     * @private
     * @param {array} nodes Array of node objects.
     * @return {void}
     */
    renderNodes(nodes) {
        ReactDOM.render(
            <Tree dom={this} nodes={nodes || this._tree.nodes()} />,
            this.$target
        );
    }

    /**
     * Listens for scroll events, to automatically trigger
     * Load More links when they're scrolled into view.
     *
     * @category DOM
     * @private
     * @param {Event} event Scroll event.
     * @return {void}
     */
    scrollListener(event) {
        if (!this.rendering && !this.loading) {
            // Get the bounding rect of the scroll layer
            const rect = this.$scrollLayer.getBoundingClientRect();

            // Find all load-more links
            const links = document.querySelectorAll(".load-more");
            _.each(links, link => {
                // Look for load-more links which overlap our "viewport"
                const r = link.getBoundingClientRect();
                const overlap = !(
                    rect.right < r.left ||
                    rect.left > r.right ||
                    rect.bottom < r.top ||
                    rect.top > r.bottom
                );

                if (overlap) {
                    // Auto-trigger Load More links
                    let context;

                    const $parent = link.parentNode.parentNode.parentNode;
                    if ($parent.tagName === "LI") {
                        context = this._tree.node(
                            $parent.getAttribute("data-uid")
                        );
                    }

                    this._tree.loadMore(context, event);
                }
            });
        }
    }

    /**
     * Scroll the first selected node into view.
     *
     * @category DOM
     * @private
     * @return {void}
     */
    scrollSelectedIntoView() {
        const $selected = this.$target.querySelector(".selected");

        if ($selected && this.$scrollLayer) {
            this.$scrollLayer.scrollTop = $selected.offsetTop;
        }
    }

    /**
     * Remove highlight class.
     *
     * @category DOM
     * @private
     * @param {HTMLElement} element Target element.
     * @return {void}
     */
    unhighlightTarget(element) {
        if (element) {
            element.classList.remove("drag-targeting", "drag-targeting-insert");
        }
    }
}
