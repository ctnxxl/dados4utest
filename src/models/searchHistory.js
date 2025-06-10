// src/models/searchHistory.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const SearchHistory = sequelize.define('SearchHistory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  term: {
    type: DataTypes.STRING,
    allowNull: false
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'search_history',
  underscored: true,
  timestamps: true
});
SearchHistory.associate = (models) => {
  SearchHistory.belongsTo(models.User, {
    foreignKey: 'created_by',
    as: 'user'
  });
};

export default SearchHistory;
