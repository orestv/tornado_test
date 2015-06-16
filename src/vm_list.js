/**
 * Created by seth on 6/6/15.
 */

define(function (require) {
    require('jquery');
    var Reflux = require('reflux');
    var React = require('react');
    var EventsInteraction = require('events_interaction');

    var VMList = React.createClass({
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
        connectionStateChanged: function(connected, connecting, vCenter) {
            this.setState({connected: connected});
        },
        render: function () {
            return (
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                        <tr>
                            <th>
                                <VMFilterForm/>
                            </th>
                            <th></th>
                            <th>
                                <button className="btn" onClick={this.btnRefreshClicked}
                                    disabled={this.state.connected ? '' : 'disabled'}>
                                    <span className="glyphicon glyphicon-refresh"></span>
                                </button>
                            </th>
                        </tr>
                        <tr>
                            <th>Name</th>
                            <th>Current Snapshot</th>
                            <th>Actions</th>
                        </tr>
                        </thead>
                        <tbody>
                        {this.state.vms.map(function (vm) {
                            return (
                                <VMRow key={vm.id} vm={vm}/>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            );
        }
    });

    var VMRow = React.createClass({
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
                <tr>
                    <td>{vm_name}</td>
                    <td>
                        {currentSnapshotName ? (
                            <button className="btn btn-default" onClick={this.revertToCurrentSnapshot}>
                                Revert
                            </button>
                        ) : null}
                        &nbsp;
                        {currentSnapshotName}
                    </td>
                    <td>
                        <VMActions vm={this.props.vm}/>
                        <VMSnapshotDialog vm={this.props.vm}/>
                    </td>
                </tr>
            )
        }
    });

    var VMSnapshotDialog = React.createClass({
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
                <div className="modal fade" id={this.getModalDialogId()}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <button type="button" className="close" data-dismiss="modal" aria-label="Close"><span
                                    aria-hidden="true">&times;</span></button>
                                <h4 className="modal-title">Snapshots of {vm.name}</h4>
                            </div>
                            <div className="modal-body">
                                <div className="row">
                                    <VMSnapshotTable vm={vm} />
                                </div>
                                <div className="row">
                                    <VMSnapshotCreateForm vm={vm}/>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-default" data-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    });

    var VMSnapshotTable = React.createClass({
        mixins: [Reflux.ListenerMixin],
        render: function() {
            var vm = this.props.vm;
            var snapshot_list = [];
            for (var snapshot_id in this.props.vm.snapshots) {
                snapshot_list.push(this.props.vm.snapshots[snapshot_id]);
            }
            return (
                <table className="table table-hover">
                    <thead>
                    <tr>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {snapshot_list.map(function(snapshot) {
                        return (
                            <VMSnapshotRow key={snapshot.id} vm={vm} snapshot={snapshot}/>
                        )
                    })}
                    </tbody>
                </table>
            );
        }
    });

    var VMSnapshotRow = React.createClass({
        revertToSnapshot: function() {
            if (confirm('Are you sure you want to revert ' + this.props.vm.name +
                    ' to snapshot ' + this.props.snapshot.name + '?'))
                EventsInteraction.actions.revertToSnapshotAction(this.props.vm.id, this.props.snapshot.id);
        },
        render: function() {
            var snapshot = this.props.snapshot;
            return (
                <tr>
                    <td>{snapshot.name}</td>
                    <td>{snapshot.description}</td>
                    <td>
                        <button className="btn btn-default" onClick={this.revertToSnapshot}>
                            Revert
                        </button>
                    </td>
                </tr>
            )
        }
    });

    var VMSnapshotCreateForm = React.createClass({
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
                <form className="form-inline" action="#" onSubmit={this.snapshotFormSubmit}>
                    <div className="form-group">
                        <input type="text" name="name" className="form-control" placeholder="Name" required/>
                        <input type="text" name="description" className="form-control"
                               placeholder="Description"/>
                        <button className="btn btn-submit" type="submit">Create</button>
                    </div>
                </form>
            )
        }
    });

    var VMFilterForm = React.createClass({
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
                <form className="form form-inline" action="#" onSubmit={this.filterFormSubmit}>
                    <div className="input-group">
                        <input type="search" className="form-control" placeholder="Filter VMs..."
                               id="vmFilterInput"
                               onChange={this.filterInputChange}
                               name="query"/>
      <span className="input-group-btn">
        <button className="btn btn-default" type="button" onClick={this.clearFilterQuery}>
            <span className="glyphicon glyphicon-remove-circle"></span>
        </button>
      </span>
                    </div>
                </form>
            );
        }
    });

    var VMActions = React.createClass({
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
                <div>
                    <button className="btn" onClick={this.showSnapshotsClicked}>
                        Show Snapshots
                    </button>
                </div>
            )
        }
    });


    return VMList;
});