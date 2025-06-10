// src/models/index.js
import sequelize from '../config/database.js';
import User from './user.js';
import SearchHistory from './searchHistory.js';

// Inicializa os modelos e configura as associações
User.hasMany(SearchHistory, {
  foreignKey: 'created_by',
  as: 'searches'
});

SearchHistory.belongsTo(User, {
  foreignKey: 'created_by',
  as: 'user'
});

// Cria e exporta o objeto db
const db = {
  sequelize,
  User,
  SearchHistory
};

export default db;
