import React from "react";
import {connect, type DispatchProp} from "react-redux";
import {Prompt} from "react-router";
import type {State} from "../reducer";

interface OwnProps {
    message: string;
}

interface StateProps {
    isPrevented: boolean;
}

interface Props extends OwnProps, StateProps, DispatchProp {}

class Component extends React.PureComponent<Props, State> {
    override componentDidUpdate(prevProps: Readonly<Props>): void {
        const {message, isPrevented} = this.props;
        if (prevProps.isPrevented !== isPrevented) {
            window.onbeforeunload = isPrevented ? () => message : null;
        }
    }

    override render() {
        const {isPrevented, message} = this.props;
        return <Prompt message={message} when={isPrevented} />;
    }
}

const mapStateToProps = (state: State): StateProps => ({isPrevented: state.navigationPrevented});

export const NavigationGuard = connect(mapStateToProps)(Component);
