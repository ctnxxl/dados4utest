// src/models/index.js
import sequelize from '../config/database.js';
import User from './user.js';
import SearchHistory from './searchHistory.js';

// Associações
User.hasMany(SearchHistory, {
  foreignKey: 'created_by',
  as: 'searches'
});
SearchHistory.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'user'
});

// Exporta tudo pronto
export { sequelize, User, SearchHistory };
