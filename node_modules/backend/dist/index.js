"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const employee_routes_1 = __importDefault(require("./routes/employee.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const dashboard_routes_1 = __importDefault(require("./routes/dashboard.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
const apiRouter = express_1.default.Router();
apiRouter.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        service: 'ICC Industries HR Portal API',
        timestamp: new Date().toISOString(),
    });
});
apiRouter.use('/auth', auth_routes_1.default);
apiRouter.use('/employees', employee_routes_1.default);
apiRouter.use('/tasks', task_routes_1.default);
apiRouter.use('/profile', profile_routes_1.default);
apiRouter.use('/dashboard', dashboard_routes_1.default);
app.use('/api', apiRouter);
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Backend server running on http://localhost:${PORT}`);
    });
}
exports.default = app;
