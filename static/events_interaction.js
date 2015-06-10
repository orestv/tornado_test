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
    var reloadVMListAction = Reflux.createAction();
    var connectAction = Reflux.createAction();
    var connectedAction = Reflux.createAction();
    var disconnectedAction = Reflux.createAction();

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

    var VMListStore = Reflux.createStore({
        init: function() {
            this.listenTo(reloadVMListAction, this.reloadHandler);
            this.listenTo(fetchVMListAction, this.refreshHandler);
        },
        reloadHandler: function(vmList) {
            this.trigger(vmList);
        },
        refreshHandler: function () {
            var messageDict = {
                'action': 'refresh_vm_list'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onmessage = function(evt) {
        var data = JSON.parse(evt.data);
        switch(data.message) {
            case 'vm_list':
                reloadVMListAction(data.parameters.vm_list);
                break;
            case 'connected':
                connectedAction(data.parameters.vCenter);
                break;
            case 'disconnected':
                disconnectedAction();
                break;
        }
    };
    wsInteract.onclose = function() {
        disconnectedAction();
    };

    return {
        actions: {
            fetchVMListAction: fetchVMListAction,
            reloadVMListAction: reloadVMListAction,
            connectedAction: connectedAction,
            connectAction: connectAction
        },
        stores: {
            VMListStore: VMListStore,
            ConnectionStore: ConnectionStore
        }
    }
});