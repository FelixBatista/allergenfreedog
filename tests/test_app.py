import os
import tempfile
import threading
import time
import json
import unittest
from http.client import HTTPConnection

from app import create_app

class ServerThread(threading.Thread):
    def __init__(self, port, **kwargs):
        super().__init__(**kwargs)
        self.server = create_app(port)
        self.port = self.server.server_address[1]

    def run(self):
        self.server.serve_forever()

    def stop(self):
        self.server.shutdown()
        self.server.server_close()

class AppTestCase(unittest.TestCase):
    def setUp(self):
        self.db_fd, self.db_path = tempfile.mkstemp()
        os.environ['DB_PATH'] = self.db_path
        self.thread = ServerThread(0, daemon=True)
        self.thread.start()
        time.sleep(0.1)

    def tearDown(self):
        self.thread.stop()
        os.close(self.db_fd)
        os.unlink(self.db_path)

    def test_get_foods(self):
        conn = HTTPConnection('localhost', self.thread.port)
        conn.request('GET', '/foods')
        resp = conn.getresponse()
        data = resp.read()
        self.assertEqual(resp.status, 200)
        foods = json.loads(data.decode())
        self.assertIsInstance(foods, list)

if __name__ == '__main__':
    unittest.main()
