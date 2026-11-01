import contextlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from backend.main import app
from backend.core import database
from scripts import seed_database


class APIRegressionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory()
        cls.path = str(Path(cls.temp.name) / 'test.db')
        cls.patches = [patch.object(database, 'DATABASE_PATH', cls.path), patch.object(seed_database, 'DATABASE_PATH', cls.path), patch('backend.api.chat.GROQ_API_KEY', '')]
        for item in cls.patches:
            item.start()
        with contextlib.redirect_stdout(io.StringIO()):
            seed_database.seed()
        cls.client = TestClient(app)
        cls.client.__enter__()
        cls.rows = cls.client.get('/api/laws/export/all').json()
        cls.ka = next(r for r in cls.rows if r['jurisdiction_name'] == 'Karnataka')

    @classmethod
    def tearDownClass(cls):
        cls.client.__exit__(None, None, None)
        for item in reversed(cls.patches):
            item.stop()
        cls.temp.cleanup()

    def test_export_preserves_offline_identifiers_and_sources(self):
        self.assertEqual(len(self.rows), 31)
        for key in ('jurisdiction_id', 'violation_id', 'vehicle_class_id', 'category_id', 'country_id', 'source_url'):
            self.assertIn(key, self.ka)

    def test_search_category_and_state_compose(self):
        response = self.client.get('/api/laws/browse', params={'jurisdiction_id': self.ka['jurisdiction_id'], 'category_id': self.ka['category_id'], 'search': '194D'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['total'], 1)

    def test_first_and_repeat_fines(self):
        request = {key:self.ka[key] for key in ('jurisdiction_id', 'violation_id', 'vehicle_class_id')}
        first = self.client.post('/api/challan/calculate', json=request).json()
        repeat = self.client.post('/api/challan/calculate', json={**request, 'is_repeat_offence':True}).json()
        self.assertEqual(first['result']['fine_amount'], 500)
        self.assertEqual(repeat['result']['fine_amount'], 1000)

    def test_zero_or_unspecified_repeat_fine_is_not_first_fine(self):
        request = {key:self.ka[key] for key in ('jurisdiction_id', 'violation_id', 'vehicle_class_id')}
        for amount in (0, None):
            with patch('backend.api.challan.calculate_challan', new=AsyncMock(return_value={**self.ka, 'subsequent_offence_fine':amount})):
                response = self.client.post('/api/challan/calculate', json={**request, 'is_repeat_offence':True})
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.json()['result']['fine_amount'], amount)

    def test_unsupported_vehicle_is_not_substituted(self):
        result = self.client.post('/api/challan/calculate', json={'jurisdiction_id':self.ka['jurisdiction_id'], 'violation_id':self.ka['violation_id'], 'vehicle_class_id':999}).json()
        self.assertFalse(result['success'])

    def test_assistant_retrieves_citations_without_ai_key(self):
        result = self.client.post('/api/chat/', json={'message':'What is the fine for no helmet?', 'jurisdiction_id':self.ka['jurisdiction_id']}).json()
        self.assertEqual(result['mode'], 'database')
        self.assertTrue(result['citations'])
        self.assertEqual(result['citations'][0]['jurisdiction'], 'Karnataka')

    def test_assistant_explicit_region_overrides_ui(self):
        result = self.client.post('/api/chat/', json={'message':'helmet in Kerala', 'jurisdiction_id':self.ka['jurisdiction_id']}).json()
        self.assertEqual(result['citations'][0]['jurisdiction'], 'Kerala')

    def test_assistant_does_not_invent_missing_records(self):
        result = self.client.post('/api/chat/', json={'message':'insurance', 'jurisdiction_id':self.ka['jurisdiction_id']}).json()
        self.assertEqual(result['citations'], [])
        self.assertIn('find a matching record', result['reply'])

    def test_analytics_labels_coverage_and_has_no_fake_hud(self):
        result = self.client.get('/api/analytics/summary').json()
        self.assertEqual(result['data_type'], 'fine_schedule_coverage')
        self.assertEqual(result['summary']['schedules'], 31)
        self.assertNotIn('hud', result)

    def test_seed_is_idempotent(self):
        with contextlib.redirect_stdout(io.StringIO()):
            seed_database.seed()
        self.assertEqual(len(self.client.get('/api/laws/export/all').json()), 31)

    def test_bad_inputs_are_rejected(self):
        self.assertEqual(self.client.get('/api/laws/browse?page=0').status_code, 422)
        self.assertEqual(self.client.get('/api/locations/speed-cameras?lat=999&lon=0').status_code, 422)
        self.assertEqual(self.client.post('/api/chat/', json={'message':''}).status_code, 422)

    def test_speed_tag_is_not_presented_as_confirmed_road_limit(self):
        response = MagicMock()
        response.__enter__.return_value.read.return_value = json.dumps({'elements':[{'id':1,'tags':{'maxspeed':'50 mph'}}]}).encode()
        with patch('backend.api.locations.urllib.request.urlopen', return_value=response):
            result = self.client.get('/api/locations/speed-limit?lat=12&lon=77').json()
        self.assertIsNone(result['speed_limit'])
        self.assertEqual(result['candidates'][0]['speed_kmh'], 80)

    def test_app_and_offline_assets_are_served(self):
        for path in ('/', '/app.js?v=20', '/js/domain.mjs', '/data/snapshot.json', '/service-worker.js', '/assets/road-journey.svg'):
            self.assertEqual(self.client.get(path).status_code, 200, path)


if __name__ == '__main__':
    unittest.main()
