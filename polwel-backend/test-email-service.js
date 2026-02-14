"use strict";
/**
 * Test the actual EmailService class to debug logo issue
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
var path_1 = __importDefault(require("path"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.join(__dirname, '.env') });
// We need to test the actual emailService
// Let's import and test it
function testEmailService() {
    return __awaiter(this, void 0, void 0, function () {
        var EmailServiceModule, EmailService, testEmail, testName, testUrl, result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n' + '='.repeat(70));
                    console.log('TESTING ACTUAL EMAIL SERVICE - LOGO DEBUG');
                    console.log('='.repeat(70));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    EmailServiceModule = require('./dist/services/emailService');
                    EmailService = EmailServiceModule.default;
                    console.log('\n📧 EmailService imported successfully');
                    console.log('  Available static methods:', Object.getOwnPropertyNames(EmailService).filter(function (m) { return m.startsWith('send'); }));
                    testEmail = process.env.TEST_EMAIL || process.env.MAIL_USER || 'test@example.com';
                    testName = 'Test Trainer';
                    testUrl = 'http://localhost:8080/trainer-setup/test-token-123';
                    console.log('\n🔍 Test Parameters:');
                    console.log('  To:', testEmail);
                    console.log('  Name:', testName);
                    console.log('  Setup URL:', testUrl);
                    console.log('\n📤 Attempting to send test email...');
                    console.log('  (Check console logs for logo loading messages)');
                    console.log('-'.repeat(70));
                    return [4 /*yield*/, EmailService.sendTrainerSetupEmail(testEmail, testName, testUrl)];
                case 2:
                    result = _a.sent();
                    console.log('-'.repeat(70));
                    console.log('\n✅ Email send result:', result);
                    if (result) {
                        console.log('\n📬 SUCCESS! Check your email inbox at:', testEmail);
                        console.log('   Look for subject: "Welcome to POLWEL - Complete Your Trainer Account Setup"');
                        console.log('   Check if the POLWEL logo displays correctly in the email header');
                    }
                    else {
                        console.log('\n⚠️  Email sending returned false (might be in development mode)');
                        console.log('   Check the console output above for the email content preview');
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('\n❌ ERROR testing email service:');
                    console.error(error_1);
                    return [3 /*break*/, 4];
                case 4:
                    console.log('\n' + '='.repeat(70));
                    console.log('TEST COMPLETED');
                    console.log('='.repeat(70) + '\n');
                    return [2 /*return*/];
            }
        });
    });
}
testEmailService();
