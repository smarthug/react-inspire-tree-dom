import React from "react";
import { ENTER } from "../lib/keycodes";
import stateComparator from "../lib/state-comparator";

export default class EditForm extends React.Component {
    constructor(props) {
        super(props);

        this.state = this.getStateFromNodes(props.node);
        this.click = this.click.bind(this);
        this.keypress = this.keypress.bind(this);
        this.change = this.change.bind(this);
        this.cancel = this.cancel.bind(this);
        this.save = this.save.bind(this);
    }

    getStateFromNodes(node) {
        return { text: node.text };
    }

    componentWillReceiveProps(data) {
        this.setState(this.getStateFromNodes(data.node));
    }

    shouldComponentUpdate(nextProps, nextState) {
        return stateComparator(this.state, nextState);
    }

    click(event) {
        event.stopPropagation();
    }

    keypress(event) {
        if (event.keyCode === ENTER) {
            return this.save();
        }
    }

    change(event) {
        this.setState({
            text: event.target.value,
        });
    }

    cancel(event) {
        if (event) {
            event.stopPropagation();
        }

        this.props.node.toggleEditing();
    }

    onBlur(event) {
        event.stopPropagation();
    }

    stopPropagation(event) {
        event.stopPropagation();
    }

    onFocus(event) {
        event.stopPropagation();
    }

    onDoubleClick(event) {
        event.stopPropagation();
    }

    save(event) {
        if (event) {
            event.stopPropagation();
        }

        // Cache current text
        const originalText = this.props.node.text;
        const newText = this.state.text;

        // Update the text
        this.props.node.set("text", newText);

        // Disable editing and update
        this.props.node.state("editing", false);
        this.props.node.markDirty();
        this.props.dom._tree.applyChanges();

        if (originalText !== newText) {
            event.persist();
            this.props.dom._tree.emit(
                "node.edited",
                this.props.node,
                originalText,
                newText
            );
        }
    }

    render() {
        return (
            <form
                onSubmit={event => {
                    event.stopPropagation();
                    event.preventDefault();
                }}>
                <input
                    onClick={this.click}
                    onChange={this.change}
                    onKeyDown={this.keypress}
                    ref={elem => {
                        this.ref = elem;
                    }}
                    value={this.state.text}
                    onBlur={this.onBlur}
                    onFocus={this.onFocus}
                    onDoubleClick={this.onDoubleClick}
                />
                <span className="btn-group">
                    <button
                        className="btn ins-icon icon-check"
                        onFocus={this.stopPropagation}
                        onClick={this.save}
                        title="Save"
                        type="button"></button>
                    <button
                        className="btn ins-icon icon-cross"
                        onFocus={this.stopPropagation}
                        onClick={this.cancel}
                        title="Cancel"
                        type="button"></button>
                </span>
            </form>
        );
    }
}
