const router = require('express').Router();
const announcement = require('../../../controllers/admin/marketing/announcement.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(announcement.list));
router.post('/', ah(announcement.create));
router.put('/:id', ah(announcement.update));
router.patch('/:id/toggle', ah(announcement.toggle));
router.patch('/:id/toggle-popup', ah(announcement.togglePopup));
router.delete('/:id', ah(announcement.remove));

module.exports = router;
