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

    var buttonClickedAction = Reflux.createAction();

    var InteractionStore = Reflux.createStore({
        init: function() {
            this.listenTo(buttonClickedAction, this.buttonClickedHandler);
        },
        buttonClickedHandler: function() {
            var messageDict = {
                'action': 'buttonClicked'
            };
            var messageJSON = JSON.stringify(messageDict);
            wsInteract.send(messageJSON);
        },
        action: function(messageDict) {
            messageDict.id = uuid();
        }
    });

    var wsInteract = new WebSocket('ws://' + window.location.host + '/interact.ws');
    wsInteract.onmessage = function(evt) {
        var data = JSON.parse(evt.data);
    };

    return {
        actions: {
            buttonClickedAction: buttonClickedAction
        },
        stores: {
            ActionStore: InteractionStore
        }
    }
});