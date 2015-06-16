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
                vms: [],
                connected: false
            }
        },
        componentDidMount: function () {
            this.listenTo(EventsInteraction.stores.VMListStore, this.loadVMList);
            this.listenTo(EventsInteraction.stores.ConnectionStore, this.connectionStateChanged);
        },
        loadVMList: function (vmList) {
            this.setState({
                vms: vmList
            })
        },
        btnRefreshClicked: function() {
            EventsInteraction.actions.fetchVMListAction();
        },
        connectionStateChanged: function(connectionState) {
            this.setState({connected: connectionState.connected});
        },
        render: function () {
            return (
                React.createElement("div", {className: "table-responsive"}, 
                    React.createElement("table", {className: "table table-hover"}, 
                        React.createElement("thead", null, 
                        React.createElement("tr", null, 
                            React.createElement("th", null, 
                                React.createElement(VMFilterForm, null)
                            ), 
                            React.createElement("th", null), 
                            React.createElement("th", null, 
                                React.createElement("button", {className: "btn", onClick: this.btnRefreshClicked, 
                                    disabled: this.state.connected ? '' : 'disabled'}, 
                                    React.createElement("span", {className: "glyphicon glyphicon-refresh"})
                                )
                            )
                        ), 
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
                        React.createElement(VMActions, {vm: this.props.vm}), 
                        React.createElement(VMSnapshotDialog, {vm: this.props.vm})
                    )
                )
            )
        }
    });

    var VMSnapshotDialog = React.createClass({displayName: "VMSnapshotDialog",
        mixins: [Reflux.ListenerMixin],
        componentDidMount: function() {
            this.listenTo(EventsInteraction.stores.SnapshotDialogStore, this.changeDialogState)
        },
        changeDialogState: function(vm_id, visible) {
            var this_vm_id = this.props.vm.id;
            if (this_vm_id != vm_id)
                return;

            if (visible)
                $(this.getModalDialog()).modal('show');
            else
                $(this.getModalDialog()).modal('hide');
        },
        getModalDialogId: function() {
            return 'modal_snapshots_' + this.props.vm.id;
        },
        getModalDialog: function() {
            return document.getElementById(this.getModalDialogId());
        },
        render: function() {
            var vm = this.props.vm;
            return (
                React.createElement("div", {className: "modal fade", id: this.getModalDialogId()}, 
                    React.createElement("div", {className: "modal-dialog"}, 
                        React.createElement("div", {className: "modal-content"}, 
                            React.createElement("div", {className: "modal-header"}, 
                                React.createElement("button", {type: "button", className: "close", "data-dismiss": "modal", "aria-label": "Close"}, React.createElement("span", {
                                    "aria-hidden": "true"}, "×")), 
                                React.createElement("h4", {className: "modal-title"}, "Snapshots of ", vm.name)
                            ), 
                            React.createElement("div", {className: "modal-body"}, 
                                React.createElement("div", {className: "row"}, 
                                    React.createElement(VMSnapshotTable, {vm: vm})
                                ), 
                                React.createElement("div", {className: "row"}, 
                                    React.createElement(VMSnapshotCreateForm, {vm: vm})
                                )
                            ), 
                            React.createElement("div", {className: "modal-footer"}, 
                                React.createElement("button", {type: "button", className: "btn btn-default", "data-dismiss": "modal"}, "Close")
                            )
                        )
                    )
                )
            )
        }
    });

    var VMSnapshotTable = React.createClass({displayName: "VMSnapshotTable",
        mixins: [Reflux.ListenerMixin],
        render: function() {
            var vm = this.props.vm;
            var snapshot_list = [];
            for (var snapshot_id in this.props.vm.snapshots) {
                snapshot_list.push(this.props.vm.snapshots[snapshot_id]);
            }
            return (
                React.createElement("table", {className: "table table-hover"}, 
                    React.createElement("thead", null, 
                    React.createElement("tr", null, 
                        React.createElement("th", null, "Name"), 
                        React.createElement("th", null, "Description"), 
                        React.createElement("th", null, "Actions")
                    )
                    ), 
                    React.createElement("tbody", null, 
                    snapshot_list.map(function(snapshot) {
                        return (
                            React.createElement(VMSnapshotRow, {key: snapshot.id, vm: vm, snapshot: snapshot})
                        )
                    })
                    )
                )
            );
        }
    });

    var VMSnapshotRow = React.createClass({displayName: "VMSnapshotRow",
        revertToSnapshot: function() {
            if (confirm('Are you sure you want to revert ' + this.props.vm.name +
                    ' to snapshot ' + this.props.snapshot.name + '?'))
                EventsInteraction.actions.revertToSnapshotAction(this.props.vm.id, this.props.snapshot.id);
        },
        deleteSnapshot: function() {
            if (confirm('Are you sure you want to delete snapshot ' + this.props.snapshot.name +
                    'on VM ' + this.props.vm.name + '?'))
                EventsInteraction.actions.deleteSnapshotAction(this.props.vm.id, this.props.snapshot.id);
        },
        render: function() {
            var snapshot = this.props.snapshot;
            return (
                React.createElement("tr", null, 
                    React.createElement("td", null, snapshot.name), 
                    React.createElement("td", null, snapshot.description), 
                    React.createElement("td", null, 
                        React.createElement("button", {className: "btn btn-default", onClick: this.revertToSnapshot}, 
                            "Revert"
                        ), 
                        React.createElement("button", {className: "btn btn-danger", onClick: this.deleteSnapshot}, 
                            "Delete"
                        )
                    )
                )
            )
        }
    });

    var VMSnapshotCreateForm = React.createClass({displayName: "VMSnapshotCreateForm",
        snapshotFormSubmit: function(evt) {
            evt.preventDefault();

            var name = '';
            var description = '';
            var vm_id = this.props.vm.id;

            var form = evt.target;
            var form_data = $(form).serializeArray();
            for (var i in form_data) {
                var item = form_data[i];
                if (item.name == 'name')
                    name = item.value;
                else if (item.name == 'description')
                    description = item.value;
            }

            EventsInteraction.actions.createSnapshotAction(vm_id, name, description);

            $(form).find(':input').val('')
        },
        render: function() {
            return (
                React.createElement("form", {className: "form-inline", action: "#", onSubmit: this.snapshotFormSubmit}, 
                    React.createElement("div", {className: "form-group"}, 
                        React.createElement("input", {type: "text", name: "name", className: "form-control", placeholder: "Name", required: true}), 
                        React.createElement("input", {type: "text", name: "description", className: "form-control", 
                               placeholder: "Description"}), 
                        React.createElement("button", {className: "btn btn-submit", type: "submit"}, "Create")
                    )
                )
            )
        }
    });

    var VMFilterForm = React.createClass({displayName: "VMFilterForm",
        mixins: [Reflux.ListenerMixin],
        filterFormSubmit: function(evt) {
            evt.preventDefault();
            var filterQuery = $('#vmFilterInput').val();
            EventsInteraction.actions.VMListFilterAction(filterQuery);
        },
        filterInputChange: function(evt) {
            var filterQuery = $('#vmFilterInput').val();
            EventsInteraction.actions.VMListFilterAction(filterQuery);
        },
        clearFilterQuery: function() {
            $('#vmFilterInput').val('');
            EventsInteraction.actions.VMListFilterAction('');
        },
        render: function() {
            return (
                React.createElement("form", {className: "form form-inline", action: "#", onSubmit: this.filterFormSubmit}, 
                    React.createElement("div", {className: "input-group"}, 
                        React.createElement("input", {type: "search", className: "form-control", placeholder: "Filter VMs...", 
                               id: "vmFilterInput", 
                               onChange: this.filterInputChange, 
                               name: "query"}), 
      React.createElement("span", {className: "input-group-btn"}, 
        React.createElement("button", {className: "btn btn-default", type: "button", onClick: this.clearFilterQuery}, 
            React.createElement("span", {className: "glyphicon glyphicon-remove-circle"})
        )
      )
                    )
                )
            );
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
        showSnapshotsClicked: function() {
            EventsInteraction.actions.showSnapshotsDialogAction(this.props.vm.id);
        },
        render: function () {
            return (
                React.createElement("div", null, 
                    React.createElement("button", {className: "btn", onClick: this.showSnapshotsClicked}, 
                        "Show Snapshots"
                    )
                )
            )
        }
    });


    return VMList;
});