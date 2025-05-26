export const getRequestNotificationTemplate = (requestType, senderName, details) => {
  const baseUrl = process.env.FRONTEND_URL;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Request Notification</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f3f4f6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 0;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #4F46E5;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px 8px 0 0;
        }
        .content {
          padding: 30px;
          background-color: #ffffff;
        }
        .button-container {
          text-align: center;
          margin: 30px 0;
        }
        .button {
          display: inline-block;
          padding: 14px 28px;
          background-color: #4F46E5;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          min-width: 200px;
          border: none;
          cursor: pointer;
          transition: background-color 0.3s ease;
        }
        .button:hover {
          background-color: #4338CA;
        }
        .details {
          background-color: #f9fafb;
          padding: 20px;
          border-radius: 6px;
          margin: 20px 0;
          border: 1px solid #e5e7eb;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New ${requestType} Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have received a new ${requestType.toLowerCase()} request from <strong>${senderName}</strong>.</p>
          
          <div class="details">
            ${details}
          </div>

          <p>Please review this request and take appropriate action.</p>
          
          <div class="button-container">
            <a href="${baseUrl}/dashboard/requests" class="button" target="_blank" rel="noopener noreferrer">
              View Request
            </a>
          </div>
          
          <p>If you have any questions, please contact the administration.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} USTHB. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getSwapRequestTemplate = (senderName, assignmentDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Swap Request</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f3f4f6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 0;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #059669;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 40px;
          background-color: #ffffff;
        }
        .details {
          background-color: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          margin: 24px 0;
          border: 1px solid #e5e7eb;
        }
        .details h3 {
          color: #059669;
          margin-top: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .details p {
          margin: 8px 0;
          color: #4b5563;
        }
        .details strong {
          color: #374151;
        }
        .button-container {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #059669;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.3s ease;
        }
        .button:hover {
          background-color: #047857;
        }
        .footer {
          text-align: center;
          padding: 24px;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          border-radius: 0 0 12px 12px;
        }
        .assignment-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        .assignment-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .assignment-card h4 {
          color: #059669;
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 16px;
        }
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .info-row strong {
          min-width: 80px;
          color: #374151;
        }
        .info-row span {
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Surveillance Swap Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have received a new surveillance swap request from <strong>${senderName}</strong>.</p>
          
          <div class="assignment-grid">
            <div class="assignment-card">
              <h4>Your Current Assignment</h4>
              <div class="info-row">
                <strong>Date:</strong>
                <span>${new Date(assignmentDetails.date).toLocaleDateString()}</span>
              </div>
              <div class="info-row">
                <strong>Time:</strong>
                <span>${assignmentDetails.time}</span>
              </div>
              <div class="info-row">
                <strong>Module:</strong>
                <span>${assignmentDetails.module}</span>
              </div>
              <div class="info-row">
                <strong>Room:</strong>
                <span>${assignmentDetails.room}</span>
              </div>
            </div>

            <div class="assignment-card">
              <h4>Requested Assignment</h4>
              <div class="info-row">
                <strong>Date:</strong>
                <span>${new Date(assignmentDetails.requestedDate).toLocaleDateString()}</span>
              </div>
              <div class="info-row">
                <strong>Time:</strong>
                <span>${assignmentDetails.requestedTime}</span>
              </div>
              <div class="info-row">
                <strong>Module:</strong>
                <span>${assignmentDetails.requestedModule}</span>
              </div>
              <div class="info-row">
                <strong>Room:</strong>
                <span>${assignmentDetails.requestedRoom}</span>
              </div>
            </div>
          </div>

          <div class="button-container">
            <a href="${process.env.FRONTEND_URL}/user/surveillance" class="button">
              View Request
            </a>
          </div>
          
          <p>Please review this request and take appropriate action.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} USTHB. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPermutationRequestTemplate = (senderName, slotDetails) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Permutation Request</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background-color: #f3f4f6;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          padding: 0;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
          background-color: #059669;
          color: white;
          padding: 30px;
          text-align: center;
          border-radius: 12px 12px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }
        .content {
          padding: 40px;
          background-color: #ffffff;
        }
        .details {
          background-color: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          margin: 24px 0;
          border: 1px solid #e5e7eb;
        }
        .details h3 {
          color: #059669;
          margin-top: 0;
          font-size: 18px;
          font-weight: 600;
        }
        .details p {
          margin: 8px 0;
          color: #4b5563;
        }
        .details strong {
          color: #374151;
        }
        .button-container {
          text-align: center;
          margin: 32px 0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #059669;
          color: white !important;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 16px;
          transition: background-color 0.3s ease;
        }
        .button:hover {
          background-color: #047857;
        }
        .footer {
          text-align: center;
          padding: 24px;
          color: #6b7280;
          font-size: 14px;
          border-top: 1px solid #e5e7eb;
          background-color: #f9fafb;
          border-radius: 0 0 12px 12px;
        }
        .slot-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin: 20px 0;
        }
        .slot-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }
        .slot-card h4 {
          color: #059669;
          margin-top: 0;
          margin-bottom: 16px;
          font-size: 16px;
        }
        .info-row {
          display: flex;
          align-items: center;
          margin-bottom: 8px;
        }
        .info-row strong {
          min-width: 80px;
          color: #374151;
        }
        .info-row span {
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Schedule Permutation Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>You have received a new schedule permutation request from <strong>${senderName}</strong>.</p>
          
          <div class="slot-grid">
            <div class="slot-card">
              <h4>Your Current Slot</h4>
              <div class="info-row">
                <strong>Module:</strong>
                <span>${slotDetails.toModule}</span>
              </div>
              <div class="info-row">
                <strong>Day:</strong>
                <span>${slotDetails.toDay}</span>
              </div>
              <div class="info-row">
                <strong>Time:</strong>
                <span>${slotDetails.toTime}</span>
              </div>
            </div>
            <div class="slot-card">
              <h4>Proposed Slot</h4>
              <div class="info-row">
                <strong>Module:</strong>
                <span>${slotDetails.fromModule}</span>
              </div>
              <div class="info-row">
                <strong>Day:</strong>
                <span>${slotDetails.fromDay}</span>
              </div>
              <div class="info-row">
                <strong>Time:</strong>
                <span>${slotDetails.fromTime}</span>
              </div>
            </div>
          </div>

          <div class="button-container">
            <a href="${process.env.FRONTEND_URL}/user/schedule" class="button">
              View Request
            </a>
          </div>
          
          <p>Please review this request and take appropriate action.</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>&copy; ${new Date().getFullYear()} USTHB. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};