/**
 * Created by seth on 6/7/15.
 */

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}


define(function(require){
    require('jquery');
    var Reflux = require('reflux');

    var tasksReceivedAction = Reflux.createAction();
    var taskUpdatedAction = Reflux.createAction();

    var buttonClickedAction = Reflux.createAction();

    var StatusStore = Reflux.createStore({
        init: function(){
            this.taskDict = {};
            this.listenTo(tasksReceivedAction, this.tasksReceivedHandler);
            this.listenTo(taskUpdatedAction, this.taskUpdatedHandler);
        },
        tasksReceivedHandler: function(tasks){
            this.taskDict = tasks;
            this.trigger(this.taskDict);
        },
        taskUpdatedHandler: function(task){
            this.taskDict[task.id] = task;
            this.trigger(this.taskDict);
        }
    });

    var ActionStore = Reflux.createStore({
        init: function() {
            this.listenTo(buttonClickedAction, this.buttonClickedHandler);
        },
        buttonClickedHandler: function() {
            var messageDict = {
                'action': 'buttonClicked'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onopen = function() {
        //wsInteract.close();
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

    return {
        actions: {
            tasksReceivedAction: tasksReceivedAction,
            taskUpdatedAction: taskUpdatedAction,
            buttonClickedAction: buttonClickedAction
        },
        stores: {
            StatusStore: StatusStore,
            ActionStore: ActionStore
        }
    }
});