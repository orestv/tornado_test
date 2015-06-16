/**
 * Created by seth on 6/7/15.
 */

function uuid() {
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

define(function(require){
    require('jquery');
    var Reflux = require('reflux');

    var fetchVMListAction = Reflux.createAction();
    var VMListFetchedAction = Reflux.createAction();
    var VMFetchedAction = Reflux.createAction();

    var VMListFilterAction = Reflux.createAction();

    var connectAction = Reflux.createAction();
    var connectedAction = Reflux.createAction();
    var disconnectedAction = Reflux.createAction();

    var fetchSnapshotsAction = Reflux.createAction();
    var snapshotsFetchedAction = Reflux.createAction();
    var currentSnapshotFetchedAction = Reflux.createAction();
    var revertToSnapshotAction = Reflux.createAction();
    var createSnapshotAction = Reflux.createAction();
    var deleteSnapshotAction = Reflux.createAction();

    var showSnapshotsDialogAction = Reflux.createAction();
    var hideSnapshotsDialogAction = Reflux.createAction();

    var ConnectionStore = Reflux.createStore({
        init: function() {
            this.listenTo(connectAction, this.connectHandler);
            this.listenTo(connectedAction, this.connectedHandler);
            this.listenTo(disconnectedAction, this.disconnectedHandler);
        },
        connectHandler: function(vCenterConnectionInfo) {
            this.trigger({connected: false, connecting: true, vCenter: vCenterConnectionInfo.vCenter});
            var messageDict = {
                action: 'connect',
                parameters: vCenterConnectionInfo
            };
            wsInteract.send(JSON.stringify(messageDict));
        },
        connectedHandler: function(vCenter) {
            this.trigger({connected: true, connecting: false, vCenter: vCenter});
            fetchVMListAction();
        },
        disconnectedHandler: function() {
            this.trigger({connected: false, connecting: false, vCenter: null});
        }
    });

    var VMStateStore = Reflux.createStore({
        init: function() {
            this.vmState = {};
            this.listenTo(snapshotsFetchedAction, this.snapshotsFetched);
            this.listenTo(fetchSnapshotsAction, this.fetchSnapshots);
            this.listenTo(currentSnapshotFetchedAction, this.currentSnapshotFetched);
        },
        fetchSnapshots: function(vmId) {
            var messageDict = {
                action: 'fetch_snapshots',
                parameters: {
                    vm_id: vmId
                }
            };
            wsInteract.send(JSON.stringify(messageDict));
        },
        snapshotsFetched: function(vmSnapshots) {
            var vmId = vmSnapshots.vm_id;
            if (!(vmId in this.vmState))
                this.vmState[vmId] = {};
            this.vmState[vmId].snapshot_list = vmSnapshots.snapshot_list;
            this.trigger(this.vmState, vmId);
        },
        currentSnapshotFetched: function(snapshotName, vmId) {
            if (!(vmId in this.vmState))
                this.vmState[vmId] = {};
            this.vmState[vmId].currentSnapshotName = snapshotName;
            this.trigger(this.vmState, vmId);
        }
    });

    var SnapshotDialogStore = Reflux.createStore({
        init: function() {
            this.listenTo(showSnapshotsDialogAction, this.showSnapshotDialog);
            this.listenTo(hideSnapshotsDialogAction, this.hideSnapshotDialog);
        },
        showSnapshotDialog: function(vm_id) {
            this.trigger(vm_id, true);
        },
        hideSnapshotDialog: function(vm_id) {
            this.trigger(vm_id, false);
        }
    });

    var VMListStore = Reflux.createStore({
        init: function() {
            this.listenTo(VMListFetchedAction, this.vmListUpdatedHandler);
            this.listenTo(fetchVMListAction, this.fetchVMListHandler);

            this.listenTo(revertToSnapshotAction, this.revertToSnapshotHandler);
            this.listenTo(createSnapshotAction, this.createSnapshotHandler);
            this.listenTo(deleteSnapshotAction, this.deleteSnapshotHandler);

            this.listenTo(VMFetchedAction, this.vmUpdatedHandler);
            this.listenTo(VMListFilterAction, this.vmListFilterhandler);
            this.vmList = [];
            this.filterQuery = '';
        },
        filterVMList: function(vmList, query) {
            query = $.trim(query);
            var filteredVMList = [];
            query = query.toLowerCase();
            for (var i in vmList) {
                var vm = vmList[i];
                if (query == '' || vm.name.toLowerCase().indexOf(query.toLowerCase()) != -1)
                    filteredVMList.push(vm);
            }
            return filteredVMList;
        },
        triggerFilteredList: function() {
            if (!this.filterQuery)
                this.trigger(this.vmList);
            else
                this.trigger(this.filterVMList(this.vmList, this.filterQuery));
        },
        vmListFilterhandler: function(query) {
            this.filterQuery = query;
            this.triggerFilteredList();
        },
        vmListUpdatedHandler: function(vmList) {
            this.vmList = vmList;
            this.triggerFilteredList();
        },
        vmUpdatedHandler: function(updatedVm) {
            for (var i in this.vmList) {
                var vm = this.vmList[i];
                if (vm.id == updatedVm.id){
                    this.vmList[i] = updatedVm;
                    this.triggerFilteredList();
                    break;
                }
            }
        },
        fetchVMListHandler: function () {
            var messageDict = {
                'action': 'refresh_vm_list'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        },
        revertToSnapshotHandler: function(vm_id, snapshot_id) {
            var messageDict = {
                action: 'revert_to_snapshot',
                parameters: {
                    vm_id: vm_id,
                    snapshot_id: snapshot_id
                }
            };
            wsInteract.send(JSON.stringify(messageDict))
        },
        createSnapshotHandler: function(vm_id, snapshot_name, snapshot_description) {
            var messageDict = {
                action: 'create_snapshot',
                parameters: {
                    vm_id: vm_id,
                    snapshot_name: snapshot_name,
                    snapshot_description: snapshot_description
                }
            };
            wsInteract.send(JSON.stringify(messageDict));
        },
        deleteSnapshotHandler: function(vm_id, snapshot_id) {
            var messageDict = {
                action: 'delete_snapshot',
                parameters: {
                    snapshot_id: snapshot_id,
                    vm_id: vm_id
                }
            };
            wsInteract.send(JSON.stringify(messageDict));
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onmessage = function(evt) {
        var data = JSON.parse(evt.data);
        switch(data.message) {
            case 'vm_list':
                VMListFetchedAction(data.parameters.vm_list);
                break;
            case 'connected':
                connectedAction(data.parameters.vCenter);
                break;
            case 'disconnected':
                disconnectedAction();
                break;
            case 'snapshot_list':
                snapshotsFetchedAction(data.parameters);
                break;
            case 'vm':
                VMFetchedAction(data.parameters.vm);
                break;
        }
    };
    wsInteract.onclose = function() {
        disconnectedAction();
    };

    return {
        actions: {
            fetchVMListAction: fetchVMListAction,
            VMListFetchedAction: VMListFetchedAction,

            VMListFilterAction: VMListFilterAction,

            connectedAction: connectedAction,
            connectAction: connectAction,
            disconnectedAction: disconnectedAction,

            fetchSnapshotsAction: fetchSnapshotsAction,
            snapshotsFetchedAction: snapshotsFetchedAction,

            revertToSnapshotAction: revertToSnapshotAction,
            createSnapshotAction: createSnapshotAction,
            deleteSnapshotAction: deleteSnapshotAction,

            showSnapshotsDialogAction: showSnapshotsDialogAction,
            hideSnapshotsDialogAction: hideSnapshotsDialogAction
        },
        stores: {
            VMListStore: VMListStore,
            ConnectionStore: ConnectionStore,
            VMStateStore: VMStateStore,
            SnapshotDialogStore: SnapshotDialogStore
        }
    }
});