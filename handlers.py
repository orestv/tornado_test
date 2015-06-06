import datetime
import json
import uuid

import tornado
import tornado.gen
import tornado.web
import tornado.websocket

class HelloHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        self.render('main.html')


class TaskStatusHandler(tornado.websocket.WebSocketHandler):
    _tasks = {}
    _clients = []

    @staticmethod
    def add_task(name, status):
        task_id = uuid.uuid4().get_hex()
        task = {
            'id': task_id,
            'name': name,
            'start_date': datetime.datetime.now().isoformat(),
            'status': status,
        }
        TaskStatusHandler._tasks[task_id] = task

        message_dict = {
            'action': 'UPDATE',
            'task': task,
        }
        TaskStatusHandler.send_all_clients(message_dict)

    @staticmethod
    def tasks():
        return TaskStatusHandler._tasks

    @staticmethod
    def clients():
        return TaskStatusHandler._clients

    @staticmethod
    def send_all_clients(message_dict):
        message_json = json.dumps(message_dict)
        for client in TaskStatusHandler.clients():
            client.write_message(message_json)

    def on_close(self):
        TaskStatusHandler.clients().remove(self)

    def open(self, *args, **kwargs):
        message_dict = {
            'action': 'LIST',
            'tasks': TaskStatusHandler.tasks(),
        }
        message_json = json.dumps(message_dict)
        self.write_message(message_json)

        TaskStatusHandler.clients().append(self)

    def on_message(self, message):
        pass


class ActionHandler(tornado.websocket.WebSocketHandler):

    def get_handler(self, action):
        handlers = {
            'buttonClicked': self.button_clicked_handler,
        }
        return handlers[action]

    @tornado.gen.coroutine
    def button_clicked_handler(self, parameters):
        TaskStatusHandler.add_task('button clicked', 'Started')

    def on_message(self, message):
        message_dict = json.loads(message)
        handler = self.get_handler(message_dict['action'])
        parameters = message_dict.get('parameters', None)

        handler(parameters)

