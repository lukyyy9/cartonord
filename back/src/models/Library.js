const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Library = sequelize.define('Library', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    }
  }, {
    tableName: 'libraries',
    timestamps: true,
    underscored: true
  });

  return Library;
};
