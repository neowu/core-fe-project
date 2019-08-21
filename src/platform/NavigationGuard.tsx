import React from "react";
import {connect, DispatchProp} from "react-redux";
import {Prompt} from "react-router";
import {Location} from "history";
import {State} from "../reducer";

interface OwnProps {
    message: ((isSamePage: boolean) => string) | string;
}

interface StateProps {
    isPrevented: boolean;
}

interface Props extends OwnProps, StateProps, DispatchProp {}

class Component extends React.PureComponent<Props, State> {
    componentDidUpdate(prevProps: Readonly<Props>): void {
        const {message, isPrevented} = this.props;
        if (prevProps.isPrevented !== isPrevented) {
            window.onbeforeunload = isPrevented ? () => message : null;
        }
    }

    getMessage = (location: Location): string => {
        const {message} = this.props;
        if (typeof message === "string") {
            return message;
        } else {
            return message(location.pathname === window.location.pathname);
        }
    };

    render() {
        const {isPrevented} = this.props;
        return <Prompt message={this.getMessage} when={isPrevented} />;
    }
}

const mapStateToProps = (state: State): StateProps => ({isPrevented: state.navigationPrevented});

export const NavigationGuard = connect(mapStateToProps)(Component);
