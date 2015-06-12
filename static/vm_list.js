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
                React.createElement("table", {className: "table table-hover"}, 
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
        mixins: [Reflux.ListenerMixin],
        componentDidMount: function () {
            this.vm = this.props.vm;
        },
        revertToCurrentSnapshot: function() {
            var vmName = this.props.vm.name;
            var currentSnapshotId = this.props.vm.current_snapshot;
            var snapshotName = this.props.vm.snapshots[currentSnapshotId].name;

            if (confirm('Are you sure you want to revert ' + vmName + ' to snapshot ' + snapshotName + '?'))
                EventsInteraction.actions.revertToSnapshotAction(this.props.vm.id, currentSnapshotId);
        },
        render: function () {
            var vm_name = this.props.vm.name;

            var currentSnapshotId = this.props.vm.current_snapshot;
            var currentSnapshotName = currentSnapshotId ? this.props.vm.snapshots[currentSnapshotId].name : null;

            return (
                React.createElement("tr", null, 
                    React.createElement("td", null, vm_name), 
                    React.createElement("td", null, 
                        currentSnapshotName ? (
                            React.createElement("button", {className: "btn btn-default", onClick: this.revertToCurrentSnapshot}, 
                                "Revert"
                            )
                        ) : null, 
                        " ", 
                        currentSnapshotName
                    ), 
                    React.createElement("td", null, 
                        React.createElement(VMActions, {vm: this.props.vm})

                    )
                )
            )
        }
    });

    var VMActions = React.createClass({displayName: "VMActions",
        mixins: [Reflux.ListenerMixin],
        componentDidMount: function () {
            this.listenTo(EventsInteraction.stores.VMStateStore, this.vmStateChanged);
        },
        vmStateChanged: function(vmState, vmId) {
            if (vmId != null && vmId != this.props.vm.name)
                return;
            var thisVmState = vmState[vmId];
            console.log(thisVmState);
        },
        render: function () {
            return (
                React.createElement("div", null

                )
            )
        }
    });


    return VMList;
});