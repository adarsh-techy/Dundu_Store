exports.up = (pgm) => {
  pgm.addColumns('orders', {
    courier_name:            { type: 'varchar(100)' },
    courier_tracking_number: { type: 'varchar(100)' },
    courier_phone:           { type: 'varchar(20)' },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('orders', ['courier_name', 'courier_tracking_number', 'courier_phone']);
};
