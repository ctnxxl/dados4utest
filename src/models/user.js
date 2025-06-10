// src/models/user.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  // novo campo de login
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50]
    }
  },

  // mantém o email se quiser guardar
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true,
    validate: { isEmail: true }
  },

  password_hash: {
    type: DataTypes.STRING,
    allowNull: false
  },

  role: {
    type: DataTypes.ENUM('admin','user'),
    allowNull: false,
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  underscored: true,
  timestamps: true
});
User.associate = models => {
  User.belongsTo(models.User, { as: 'criador', foreignKey: 'created_by' });
  User.hasMany(models.User, { as: 'criados', foreignKey: 'created_by' });
};

export default User;
