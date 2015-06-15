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
                <div className="table-responsive">
                    <table className="table table-hover">
                        <thead>
                        <tr>
                            <th>
                                <VMFilterForm/>
                            </th>
                            <th></th>
                            <th></th>
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

                    </td>
                </tr>
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
        render: function () {
            return (
                <div>

                </div>
            )
        }
    });


    return VMList;
});