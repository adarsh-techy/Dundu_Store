const router = require('express').Router();
const { notTrashed } = require('../../../services/trash/trash.service');
// Records sitting in Trash cannot be read, edited or toggled here (restore them first).
router.use('/:id', (req, res, next) => (req.method === 'DELETE' ? next() : notTrashed('announcements')(req, res, next)));
const announcement = require('../../../controllers/admin/marketing/announcement.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(announcement.list));
router.post('/', ah(announcement.create));
router.put('/:id', ah(announcement.update));
router.patch('/:id/toggle', ah(announcement.toggle));
router.patch('/:id/toggle-popup', ah(announcement.togglePopup));
router.delete('/:id', ah(announcement.remove));

module.exports = router;
