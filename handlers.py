import concurrent.futures.thread
import datetime
import functools
import json
import re
import time
import uuid

import tornado
import tornado.gen
import tornado.web
import tornado.websocket

import pysphere
from pysphere.resources import VimService_services as VI
from pysphere.vi_mor import MORTypes, VIMor
from pysphere.resources.vi_exception import VIException, FaultTypes
from pysphere.vi_task import VITask


class HelloHandler(tornado.web.RequestHandler):
    def get(self, *args, **kwargs):
        self.render('main.html')


class TaskStatusHandler(tornado.websocket.WebSocketHandler):
    TASK_LIFE = 15
    _tasks = {}
    _clients = []

    _executor = concurrent.futures.thread.ThreadPoolExecutor(2)

    ACTION_UPDATE = 'UPDATE'
    ACTION_LIST = 'LIST'

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
    def push_task_list():
        message_dict = {
            'action': TaskStatusHandler.ACTION_LIST,
            'tasks': TaskStatusHandler.tasks(),
        }
        TaskStatusHandler.send_all_clients(message_dict)

    @staticmethod
    def delete_task(task_id):
        TaskStatusHandler._executor.submit(TaskStatusHandler._delete_task, task_id)

    @staticmethod
    def _delete_task(task_id):
        del TaskStatusHandler.tasks()[task_id]
        time.sleep(TaskStatusHandler.TASK_LIFE)
        TaskStatusHandler.push_task_list()

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
        TaskStatusHandler.clients().append(self)

        TaskStatusHandler.push_task_list()

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
                    TaskStatusHandler.delete_task(task_id)
                return result
            except Exception as e:
                TaskStatusHandler.update_task(task_id, 'Exception: {0}'.format(e))
                TaskStatusHandler.delete_task(task_id)

        return wrapper

    return decorator


class ActionHandler(tornado.websocket.WebSocketHandler):
    ACTION_REFRESH_VM_LIST = 'refresh_vm_list'
    ACTION_CONNECT = 'connect'
    ACTION_FETCH_SNAPSHOTS = 'fetch_snapshots'
    ACTION_REVERT_TO_SNAPSHOT = 'revert_to_snapshot'
    ACTION_CREATE_SNAPSHOT = 'create_snapshot'
    ACTION_DELETE_SNAPSHOT = 'delete_snapshot'

    MSG_VM_LIST = 'vm_list'
    MSG_VM = 'vm'
    MSG_SNAPSHOT_LIST = 'snapshot_list'
    MSG_CURRENT_SNAPSHOT = 'current_snapshot'

    MSG_CONNECTED = 'connected'
    MSG_DISCONNECTED = 'disconnected'

    server = None

    _clients = []

    def __init__(self, application, request, **kwargs):
        super(ActionHandler, self).__init__(application, request, **kwargs)
        self.vsphere_host = None
        self.vsphere_password = None
        self.vsphere_username = None
        self.server = pysphere.VIServer()

    def get_handler(self, action):
        handlers = {
            self.ACTION_REFRESH_VM_LIST: self.handler_refresh_vm_list,
            self.ACTION_CONNECT: self.connect,
            self.ACTION_REVERT_TO_SNAPSHOT: self.handler_revert_to_snapshot,
            self.ACTION_CREATE_SNAPSHOT: self.handler_create_snapshot,
            self.ACTION_DELETE_SNAPSHOT: self.handler_delete_snapshot,
        }
        return handlers[action]

    @staticmethod
    def clients():
        return ActionHandler._clients

    def send_keepalive(self):
        if self.server.is_connected():
            self.server.keep_session_alive()

    @staticmethod
    def build_snapshot_dict(children_snapshots, snapshot_dict=None):
        if not snapshot_dict:
            snapshot_dict = {}

        for snapshot in children_snapshots:
            snapshot_dict[snapshot.Snapshot] = snapshot
            children = None
            try:
                children = snapshot.ChildSnapshotList
            except AttributeError:
                pass
            if children:
                ActionHandler.build_snapshot_dict(children, snapshot_dict)

        return snapshot_dict

    def get_vm_list(self):
        vm_dict = self.server._get_managed_objects(MORTypes.VirtualMachine, from_mor=None)
        vm_mor_list = vm_dict.keys()
        return self._get_vm_list(vm_mor_list)

    def _get_vm_list(self, vm_mor_list):
        props = self.server._get_object_properties_bulk(vm_mor_list, {
            MORTypes.VirtualMachine: ['name', 'snapshot', 'snapshot.currentSnapshot']})

        vms_with_snapshots = props

        result_list = []

        for vm_mor in vms_with_snapshots:

            snapshotProp = None
            vm_name = None
            for prop in vm_mor.PropSet:
                if prop.Name == 'snapshot':
                    snapshotProp = prop
                elif prop.Name == 'name':
                    vm_name = prop.Val

            vm_dict = {
                'id': vm_mor.Obj,
                'name': vm_name,
                'current_snapshot': None,
                'snapshots': None,
            }

            if snapshotProp:
                snapshot_dict = ActionHandler.build_snapshot_dict(snapshotProp.Val.RootSnapshotList)
                vm_snapshot_dict = {}
                for snapshot_id, snapshot in snapshot_dict.iteritems():
                    vm_snapshot_dict[snapshot.Snapshot] = {
                        'id': snapshot.Snapshot,
                        'name': snapshot.Name,
                        'description': snapshot.Description,
                    }

                current_snapshot_id = None
                try:
                    current_snapshot_id = snapshotProp.Val.CurrentSnapshot
                except AttributeError:
                    pass

                vm_dict.update({
                    'snapshots': vm_snapshot_dict,
                    'current_snapshot': current_snapshot_id,
                })

            result_list.append(vm_dict)

        result_list.sort(key=lambda vm: vm['name'])

        return result_list

    @tornado.gen.coroutine
    @task('Revert to snapshot', 'Started...')
    def handler_revert_to_snapshot(self, task_id, parameters):
        vm_id = parameters['vm_id']
        snapshot_id = parameters['snapshot_id']

        vm_mor = VIMor(vm_id, MORTypes.VirtualMachine)
        snapshot_mor = VIMor(snapshot_id, MORTypes.VirtualMachineSnapshot)

        vm_properties_future = self.application.executor.submit(self.server._get_object_properties, vm_mor, ['name', 'snapshot'])

        request = VI.RevertToSnapshot_TaskRequestMsg()

        mor_snap = request.new__this(snapshot_mor)
        mor_snap.set_attribute_type(snapshot_mor.get_attribute_type())
        request.set_element__this(mor_snap)

        vm_name = None
        snapshot_name = None
        vm_properties = yield vm_properties_future
        for prop in vm_properties.PropSet:
            if prop.Name == 'name':
                vm_name = prop.Val
            elif prop.Name == 'snapshot':
                snapshot_dict = ActionHandler.build_snapshot_dict(prop.Val.RootSnapshotList)
                snapshot_name = snapshot_dict[snapshot_mor].Name

        TaskStatusHandler.update_task(task_id, 'Reverting {0} to {1}...'.format(vm_name, snapshot_name))

        vi_task = self.server._proxy.RevertToSnapshot_Task(request)._returnval

        vi_task = VITask(vi_task, self.server)
        status = yield self.application.executor.submit(
            vi_task.wait_for_state, [vi_task.STATE_SUCCESS,
                                     vi_task.STATE_ERROR])
        if status == vi_task.STATE_ERROR:
            raise VIException(vi_task.get_error_message(),
                              FaultTypes.TASK_ERROR)

        TaskStatusHandler.update_task(task_id, 'Successfully reverted {0} to {1}'.format(vm_name, snapshot_name))
        TaskStatusHandler.delete_task(task_id)

        self.send_vm_update(vm_id)

    @tornado.gen.coroutine
    @task('Delete snapshot', 'Started...')
    def handler_delete_snapshot(self, task_id, parameters):
        snapshot_id = parameters['snapshot_id']
        vm_id = parameters['vm_id']
        snapshot_mor = VIMor(snapshot_id, MORTypes.VirtualMachineSnapshot)

        request = VI.RemoveSnapshot_TaskRequestMsg()

        mor_snap = request.new__this(snapshot_mor)
        mor_snap.set_attribute_type(snapshot_mor.get_attribute_type())
        request.set_element__this(mor_snap)
        request.set_element_removeChildren(True)

        TaskStatusHandler.update_task(task_id, 'Starting background task...')

        task = (yield self.application.executor.submit(self.server._proxy.RemoveSnapshot_Task, request))._returnval

        TaskStatusHandler.update_task(task_id, 'Background task started, waiting for completion...')

        vi_task = yield self.application.executor.submit(VITask, task, self.server)

        status = yield self.application.executor.submit(vi_task.wait_for_state, [vi_task.STATE_SUCCESS,
                                                                                 vi_task.STATE_ERROR])

        if status == vi_task.STATE_ERROR:
            raise VIException(vi_task.get_error_message(),
                              FaultTypes.TASK_ERROR)

        TaskStatusHandler.update_task(task_id, 'Snapshot deleted')
        TaskStatusHandler.delete_task(task_id)

        self.send_vm_update(vm_id)

    @tornado.gen.coroutine
    @task('Create snapshot', 'Started...')
    def handler_create_snapshot(self, task_id, parameters):
        vm_id = parameters['vm_id']
        snapshot_name = parameters['snapshot_name']
        snapshot_description = parameters['snapshot_description']

        vm_mor = VIMor(vm_id, MORTypes.VirtualMachine)

        request = VI.CreateSnapshot_TaskRequestMsg()
        mor_vm = request.new__this(vm_mor)
        mor_vm.set_attribute_type(vm_mor.get_attribute_type())
        request.set_element__this(mor_vm)
        request.set_element_name(snapshot_name)
        if snapshot_description:
            request.set_element_description(snapshot_description)
        request.set_element_memory(True)
        request.set_element_quiesce(False)

        vi_task = self.server._proxy.CreateSnapshot_Task(request)._returnval

        vi_task = VITask(vi_task, self.server)

        state = None
        while state not in (vi_task.STATE_SUCCESS, vi_task.STATE_ERROR):
            time.sleep(1)

            state = yield self.application.executor.submit(vi_task.get_state)
            progress = yield self.application.executor.submit(vi_task.get_progress)
            progress = progress or 100
            TaskStatusHandler.update_task(task_id, 'Creating snapshot %s, %d%%...' % (snapshot_name, progress))

        if state == vi_task.STATE_ERROR:
            raise Exception(vi_task.get_error_message())

        TaskStatusHandler.update_task(task_id, 'Snapshot %s created!' % (snapshot_name,))
        TaskStatusHandler.delete_task(task_id)

        self.send_vm_update(vm_id)

    @tornado.gen.coroutine
    @task('VM List fetch', 'Started...')
    def handler_refresh_vm_list(self, task_id, parameters):
        TaskStatusHandler.update_task(task_id, 'Fetching VM list...')
        vm_list = yield self.application.executor.submit(self.get_vm_list)
        TaskStatusHandler.update_task(task_id, 'VM list fetched...')

        self.send_typed_message(self.MSG_VM_LIST, vm_list=vm_list)

        TaskStatusHandler.update_task(task_id, 'Finished')
        TaskStatusHandler.delete_task(task_id)

        raise tornado.gen.Return()

    def send_vm_update(self, vm_id):
        vm_mor = VIMor(vm_id, MORTypes.VirtualMachine)
        vm_list = self._get_vm_list([vm_mor])
        self.send_typed_message(ActionHandler.MSG_VM, vm=vm_list[0])

    @task('Connect to vCenter', 'Initiating connection', 'Connected successfully!')
    def connect(self, task_id, parameters):
        vCenterHost = parameters['vCenter']
        vCenterUsername = parameters['username']
        vCenterPassword = parameters['password']

        self.vsphere_host = vCenterHost
        self.vsphere_username = vCenterUsername
        self.vsphere_password = vCenterPassword

        TaskStatusHandler.update_task(task_id, 'Connecting to vCenter {0}'.format(vCenterHost))
        try:
            self.server.connect(vCenterHost, vCenterUsername, vCenterPassword)
        except Exception as e:
            self.send_typed_message(self.MSG_DISCONNECTED)
            raise

        self.send_typed_message(self.MSG_CONNECTED, vCenter=vCenterHost)

    def send_typed_message(self, message_type, **parameters):
        message_dict = {
            'message': message_type,
            'parameters': parameters,
        }
        self.write_message(json.dumps(message_dict))

    def on_message(self, message):
        message_dict = json.loads(message)
        handler = self.get_handler(message_dict['action'])
        parameters = message_dict.get('parameters', None)

        try:
            handler(parameters=parameters)
        except Exception as e:
            pass

    def open(self, *args, **kwargs):
        ActionHandler._clients.append(self)

    def on_close(self):
        if self.server and self.server.is_connected():
            self.server.disconnect()
        ActionHandler._clients.remove(self)