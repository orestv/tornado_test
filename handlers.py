import datetime
import functools
import json
import time
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

    ACTION_UPDATE = 'UPDATE'

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
            'action': TaskStatusHandler.ACTION_UPDATE,
            'task': task,
        }
        TaskStatusHandler.send_all_clients(message_dict)

        return task_id

    @staticmethod
    def update_task(task_id, status):
        task = TaskStatusHandler.tasks()[task_id]
        task['status'] = status

        message_dict = {
            'action': TaskStatusHandler.ACTION_UPDATE,
            'task': task
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


def task(task_name, initial_status, final_status=None):

    def decorator(func):

        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            task_id = TaskStatusHandler.add_task(task_name, initial_status)
            kwargs['task_id'] = task_id
            try:
                result = func(*args, **kwargs)
                if final_status:
                    TaskStatusHandler.update_task(task_id, final_status)
                return result
            except Exception as e:
                TaskStatusHandler.update_task(task_id, 'Exception: {0}'.format(e.message))

        return wrapper

    return decorator


class ActionHandler(tornado.websocket.WebSocketHandler):
    ACTION_VM_LIST = 'VMList'

    def get_handler(self, action):
        handlers = {
            'refreshVMList': self.refresh_vm_list_handler,
        }
        return handlers[action]

    def get_vm_list(self):
        time.sleep(2)
        return [
            {
                'id': 'dev-c801-01',
                'name': 'dev-c801-01',
                'currentSnapshotName': None,
            },
            {
                'id': 'dev-c801-02',
                'name': 'dev-c801-02',
                'currentSnapshotName': 'Clean 7.6.3',
            },
            {
                'id': 'dev-c801-03',
                'name': 'dev-c801-03',
                'currentSnapshotName': None,
            },
        ]

    @tornado.gen.coroutine
    @task('VM List fetch', 'Started...')
    def refresh_vm_list_handler(self, task_id, parameters):
        TaskStatusHandler.update_task(task_id, 'Fetching VM list...')
        vm_list = yield self.application.executor.submit(self.get_vm_list)
        TaskStatusHandler.update_task(task_id, 'VM list fetched...')

        message_dict = {
            'action': ActionHandler.ACTION_VM_LIST,
            'vm_list': vm_list,
        }
        message_json = json.dumps(message_dict)
        self.write_message(message_json)

        TaskStatusHandler.update_task(task_id, 'Finished')

        raise tornado.gen.Return()

    def on_message(self, message):
        message_dict = json.loads(message)
        handler = self.get_handler(message_dict['action'])
        parameters = message_dict.get('parameters', None)

        try:
            handler(parameters=parameters)
        except Exception as e:
            pass

