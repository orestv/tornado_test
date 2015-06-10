/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var VMList = React.createClass({displayName: "VMList",
        mixins: [Reflux.ListenerMixin],
        getInitialState: function () {
            return {
                vms: []
            }
        },
        componentDidMount: function () {
            this.listenTo(EventsInteraction.stores.VMListStore, this.loadVMList);
        },
        loadVMList: function (vmList) {
            this.setState({
                vms: vmList
            })
        },
        render: function () {
            return (
                React.createElement("table", {className: "table"}, 
                    React.createElement("thead", null, 
                    React.createElement("tr", null, 
                        React.createElement("th", null, "Name"), 
                        React.createElement("th", null, "Current Snapshot"), 
                        React.createElement("th", null, "Actions")
                    )
                    ), 
                    React.createElement("tbody", null, 
                    this.state.vms.map(function (vm) {
                        return (
                            React.createElement(VMRow, {key: vm.id, vm: vm})
                        )
                    })
                    )
                )
            );
        }
    });

    var VMRow = React.createClass({displayName: "VMRow",
        render: function () {
            return (
                React.createElement("tr", null, 
                    React.createElement("td", null, this.props.vm.name), 
                    React.createElement("td", null, this.props.vm.currentSnapshotName), 
                    React.createElement("td", null, React.createElement(VMActions, {vm: this.props.vm}))
                )
            )
        }
    });

    var VMActions = React.createClass({displayName: "VMActions",
        render: function () {
            return (
                React.createElement("div", null, 
                    React.createElement("button", {className: "button"}, 
                        React.createElement("span", {className: "glyphicon glyphicon-refresh"}), 
                        "Refresh"
                    )
                )
            )
        }
    });


    return VMList;
});