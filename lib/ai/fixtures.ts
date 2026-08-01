import type { GeneratedSuite, GeneratedTestCase } from "@/lib/schemas/test-case";
import type { z } from "zod";
import type { generatedUseCaseReportSchema } from "@/lib/schemas/use-case-report";

/**
 * Canned AI responses used by the mock provider (offline dev/CI) and by unit
 * tests. Kept in lib/ (not tests/) because the runtime mock provider needs them.
 */

export const cleanSuiteFixture: GeneratedSuite = {
  functionCode: "LOGIN",
  functionName: "User Login",
  requirementTitle: "User login with email and password",
  requirementSummary:
    "Registered users can sign in with a valid email and a password of 8-64 characters. After 5 failed attempts the account is locked for 15 minutes.",
  fields: [
    {
      name: "email",
      dataType: "string",
      min: null,
      max: null,
      maxLength: 254,
      allowedValues: null,
      required: true,
      description: "Registered email address",
    },
    {
      name: "password",
      dataType: "string",
      min: 8,
      max: 64,
      maxLength: 64,
      allowedValues: null,
      required: true,
      description: "Account password, 8-64 characters",
    },
  ],
  returnConditions: ["Login successful", "Invalid credentials", "Account locked"],
  logMessages: [
    "User logged in successfully",
    "Invalid email or password",
    "Account locked after 5 failed attempts",
  ],
  testCases: [
    {
      title: "Login succeeds with valid credentials",
      objective: "Verify the happy path of the login flow",
      requirementRef: "REQ-1",
      preconditions: ["User account user@test.com exists and is active"],
      steps: [
        { action: "Navigate to the /login page", expectedResult: "Login form is displayed" },
        { action: 'Enter "user@test.com" into the Email field', expectedResult: null },
        { action: 'Enter "Passw0rd!23" into the Password field', expectedResult: null },
        { action: "Click the Sign In button", expectedResult: null },
      ],
      testData: [
        { field: "email", value: "user@test.com", note: null },
        { field: "password", value: "Passw0rd!23", note: "valid password" },
      ],
      expectedResult:
        'User is redirected to /dashboard and the message "User logged in successfully" is written to the audit log',
      priority: "High",
      type: "positive",
      technique: "use-case",
    },
    {
      title: "Login fails with a wrong password",
      objective: "Verify invalid credentials are rejected",
      requirementRef: "REQ-1",
      preconditions: ["User account user@test.com exists and is active"],
      steps: [
        { action: "Navigate to the /login page", expectedResult: null },
        { action: 'Enter "user@test.com" into the Email field', expectedResult: null },
        { action: 'Enter "WrongPass99" into the Password field', expectedResult: null },
        { action: "Click the Sign In button", expectedResult: null },
      ],
      testData: [
        { field: "email", value: "user@test.com", note: null },
        { field: "password", value: "WrongPass99", note: "wrong password" },
      ],
      expectedResult:
        'The error message "Invalid email or password" is shown and the user stays on /login',
      priority: "High",
      type: "negative",
      technique: "error-guessing",
    },
    {
      title: "Password at minimum length boundary is accepted",
      objective: "Verify the 8-character lower boundary",
      requirementRef: "REQ-1",
      preconditions: ["User account short@test.com exists with password Abcdef1!"],
      steps: [
        { action: "Navigate to the /login page", expectedResult: null },
        { action: 'Enter "short@test.com" into the Email field', expectedResult: null },
        { action: 'Enter the 8-character password "Abcdef1!"', expectedResult: null },
        { action: "Click the Sign In button", expectedResult: null },
      ],
      testData: [
        { field: "email", value: "short@test.com", note: null },
        { field: "password", value: "Abcdef1!", note: "exactly 8 characters (min boundary)" },
      ],
      expectedResult: "User is redirected to /dashboard with no validation error shown",
      priority: "Medium",
      type: "boundary",
      technique: "BVA",
    },
  ],
};

/** Suite that deliberately trips R2/R4/R6/R7/R10 to exercise validation + repair. */
export const dirtySuiteFixture: GeneratedSuite = {
  ...cleanSuiteFixture,
  testCases: [
    cleanSuiteFixture.testCases[0],
    {
      title: "Login", // R2: too short
      objective: null,
      requirementRef: "REQ-1",
      preconditions: [],
      steps: [{ action: "Login", expectedResult: null }], // R4: action < 3 words
      testData: [{ field: "password", value: "<value>", note: null }], // R6: placeholder
      expectedResult: "It works correctly", // R7: not verifiable
      priority: "Low",
      type: "positive",
      technique: null,
    },
    {
      title: "Account lock check after repeated failures",
      objective: null,
      requirementRef: "REQ-1",
      preconditions: ["User account user@test.com exists"],
      steps: [
        { action: "Attempt to log in 5 times with a wrong password", expectedResult: null },
        { action: "Attempt to log in once more with the correct password", expectedResult: null },
      ],
      testData: [{ field: "password", value: "WrongPass99", note: null }],
      // R10: fabricated execution result baked into the spec
      expectedResult: "Result: Passed on 2025-01-01, Defect DF-123 closed",
      priority: "High",
      type: "negative",
      technique: null,
    },
  ],
};

/** What the mock returns for a repair call — fixed versions of the dirty cases. */
export const repairedCasesFixture: GeneratedTestCase[] = [
  {
    title: "Login rejected when password field is empty",
    objective: "Verify required-field validation on the password",
    requirementRef: "REQ-1",
    preconditions: ["User account user@test.com exists and is active"],
    steps: [
      { action: "Navigate to the /login page", expectedResult: null },
      { action: 'Enter "user@test.com" into the Email field', expectedResult: null },
      { action: "Leave the Password field empty", expectedResult: null },
      { action: "Click the Sign In button", expectedResult: null },
    ],
    testData: [
      { field: "email", value: "user@test.com", note: null },
      { field: "password", value: "", note: "empty password" },
    ],
    expectedResult: 'The validation message "Password is required" is shown under the Password field',
    priority: "Low",
    type: "positive",
    technique: null,
  },
  {
    title: "Account locks after five consecutive failed logins",
    objective: "Verify the lockout rule",
    requirementRef: "REQ-1",
    preconditions: ["User account user@test.com exists and is active"],
    steps: [
      { action: 'Attempt to log in 5 times with password "WrongPass99"', expectedResult: null },
      { action: "Attempt to log in once more with the correct password", expectedResult: null },
    ],
    testData: [{ field: "password", value: "WrongPass99", note: "wrong password, 5 attempts" }],
    expectedResult:
      'The message "Account locked after 5 failed attempts" is shown and login is rejected even with the correct password',
    priority: "High",
    type: "negative",
    technique: null,
  },
];

export const useCaseReportFixture: z.infer<typeof generatedUseCaseReportSchema> = {
  ucId: "UC-1",
  ucName: "User Login",
  createdBy: "TestcaseForge",
  dateCreated: "01/01/2026",
  primaryActor: "Registered User",
  secondaryActors: "None",
  trigger: "User wants to access a protected area of the system",
  description: "A registered user signs in with email and password to access the system.",
  preconditions: ["User has a registered, active account", "Login page is reachable"],
  postconditions: ["User session is created", "Login event is written to the audit log"],
  normalFlow: [
    { step: "1", description: "User navigates to the login page" },
    { step: "2", description: "User enters email and password" },
    { step: "3", description: "User clicks the Sign In button" },
    { step: "4", description: "System validates the credentials" },
    { step: "5", description: "System redirects the user to the dashboard" },
  ],
  alternativeFlows: [
    {
      flowId: "1.1",
      flowName: "Remembered device skips 2FA",
      steps: [
        { step: "1", description: "System detects a trusted device cookie" },
        { step: "2", description: "System skips the 2FA challenge and signs the user in" },
      ],
    },
  ],
  exceptions: [
    {
      exceptionId: "1.E1",
      exceptionName: "Invalid credentials",
      descriptions: [
        "System shows 'Invalid email or password'",
        "After 5 failures the account is locked for 15 minutes",
      ],
    },
  ],
  priority: "High",
  frequencyOfUse: "High",
  businessRules: "BR-7: lockout after 5 failed attempts",
  otherInformation: ["Passwords are never logged"],
  assumptions: ["Email delivery for reset flows is out of scope"],
};
