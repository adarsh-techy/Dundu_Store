const router = require('express').Router();
const user = require('../../../controllers/admin/users/user.controller');
const ah = require('../../../utils/asyncHandler');

router.get('/', ah(user.list));
router.get('/:id', ah(user.getOne));
router.patch('/:id/block', ah(user.toggleBlock));
router.patch('/:id/cod-block', ah(user.toggleCodBlock));
router.delete('/:id', ah(user.deleteUser));

module.exports = router;
