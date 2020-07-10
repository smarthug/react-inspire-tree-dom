import React from "react";

class ToggleAnchor extends React.Component {
    constructor(props) {
        super(props);

        this.handleToggleCollapse = this.handleToggleCollapse.bind(this);
    }

    handleToggleCollapse() {
        const { node, collapsed, hiddenDeep } = this.props;
        node.toggleCollapse();
        if (hiddenDeep) {
            const children = node.getChildren();
            if (collapsed) {
                children.showDeep();
            } else {
                children.hideDeep();
            }
        }
    }

    render() {
        const { collapsed } = this.props;
        const toggleClassName = collapsed ? "icon-expand" : "icon-collapse";
        const className = `toggle ins-icon ${toggleClassName}`;

        return <a className={className} onClick={this.handleToggleCollapse} />;
    }
}

export default ToggleAnchor;
