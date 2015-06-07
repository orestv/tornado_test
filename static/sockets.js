/**
 * Created by seth on 6/7/15.
 */

define(function(require){

    var EventsInteraction = require('events_interactin');

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onopen = function() {
        wsInteract.close();
    };
    wsInteract.onmessage = function(evt) {
        var data = JSON.parse(evt.data);
        switch(data.action) {
            case 'VMList':
                EventsInteraction.actions.reloadVMListAction(data.vm_list);
                break;
        }
    };

    var wsStatus = new WebSocket('ws://' + window.location.host + '/status.ws');
    wsStatus.onmessage = function(evt) {
        var data = evt.data;
        data = JSON.parse(data);
        switch (data.action) {
            case 'LIST':
                tasksReceivedAction(data.tasks);
                break;
            case 'UPDATE':
                taskUpdatedAction(data.task);
                break;
        }
    };
});