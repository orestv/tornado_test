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
                'action': 'refreshVMList'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onmessage = function(evt) {
        var data = JSON.parse(evt.data);
        switch(data.action) {
            case 'VMList':
                reloadVMListAction(data.vm_list);
                break;
        }
    };

    return {
        actions: {
            fetchVMListAction: fetchVMListAction,
            reloadVMListAction: reloadVMListAction
        },
        stores: {
            VMListStore: VMListStore
        }
    }
});