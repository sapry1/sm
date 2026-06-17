/* ================================================
   ãÓÇÑÇÊ ÇáãÕÇÏŞÉ æÇáÅÚÏÇÏÇÊ - routes/auth.js
   íÔãá: ÊÓÌíá ÇáÏÎæá¡ ÇáÍÓÇÈÇÊ¡ ÇáÅÚÏÇÏÇÊ¡
   áæÍÉ ÇáÊÍßã¡ ÇáÚãáÇÁ¡ ÇáäÓÎ ÇáÇÍÊíÇØíÉ
   ================================================ */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/database');

const JWT_SECRET = process.env.JWT_SECRET || 'smartmenu_secret_key_2025_X9kLmP';

/* ================================================
   ÅÚÏÇÏ ÑİÚ ÇáãáİÇÊ
   ================================================ */

const storage = multer.diskStorage({
