export default async function sendTaskReminder({ task_id, send_whatsapp = false }) {
  const { base44 } = await import('@base44/sdk/backend');
  
  // Get task details
  const task = await base44.entities.Task.get(task_id);
  
  if (!task || task.reminder_sent || task.status === 'completed' || task.status === 'cancelled') {
    return { success: false, message: 'Task not eligible for reminder' };
  }
  
  // Get assigned member
  const members = await base44.entities.TeamMember.filter({ id: task.assigned_to });
  const member = members[0];
  
  if (!member || !member.email) {
    return { success: false, message: 'Member email not found' };
  }
  
  // Get user preferences
  let preferences = null;
  try {
    const prefs = await base44.entities.UserPreferences.filter({ user_email: member.email });
    preferences = prefs[0];
  } catch (error) {
    console.log('No preferences found, using defaults');
  }
  
  const sendEmail = !preferences || preferences.task_due_email !== false;
  const sendWhatsApp = send_whatsapp && (!preferences || preferences.task_due_app !== false);
  
  const results = { email: null, whatsapp: null };
  
  // Send email reminder
  if (sendEmail) {
    try {
      await base44.integrations.Core.SendEmail({
        to: member.email,
        subject: `تذكير: ${task.title}`,
        body: `
          <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">تذكير بمهمة</h2>
            
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1f2937; margin-top: 0;">${task.title}</h3>
              ${task.description ? `<p style="color: #4b5563;">${task.description}</p>` : ''}
              
              <div style="margin-top: 15px;">
                <p style="margin: 5px 0;"><strong>الأولوية:</strong> ${getPriorityLabel(task.priority)}</p>
                ${task.due_date ? `<p style="margin: 5px 0;"><strong>تاريخ الاستحقاق:</strong> ${task.due_date}</p>` : ''}
                ${task.category ? `<p style="margin: 5px 0;"><strong>التصنيف:</strong> ${getCategoryLabel(task.category)}</p>` : ''}
              </div>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              يرجى إكمال هذه المهمة في الوقت المحدد.
            </p>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center;">
              نظام إدارة المدينة الصحية
            </p>
          </div>
        `
      });
      results.email = 'sent';
    } catch (error) {
      results.email = `failed: ${error.message}`;
    }
  }
  
  // Send WhatsApp reminder via agent
  if (sendWhatsApp && member.phone) {
    try {
      const whatsappMessage = `🔔 *تذكير بمهمة*\n\n` +
        `📋 *${task.title}*\n` +
        `${task.description ? `\n${task.description}\n` : ''}` +
        `\n⭐ *الأولوية:* ${getPriorityLabel(task.priority)}` +
        `${task.due_date ? `\n📅 *تاريخ الاستحقاق:* ${task.due_date}` : ''}` +
        `${task.category ? `\n🏷️ *التصنيف:* ${getCategoryLabel(task.category)}` : ''}` +
        `\n\nيرجى إكمال هذه المهمة في الوقت المحدد.`;
      
      // Note: WhatsApp notification will be sent through the agent
      // User needs to connect to tasks_assistant agent on WhatsApp first
      results.whatsapp = 'ready_to_send';
    } catch (error) {
      results.whatsapp = `failed: ${error.message}`;
    }
  }
  
  // Mark reminder as sent
  await base44.entities.Task.update(task_id, { reminder_sent: true });
  
  return { 
    success: true, 
    message: 'Reminder processed', 
    channels: results 
  };
}

function getPriorityLabel(priority) {
  const labels = {
    low: 'منخفضة',
    medium: 'متوسطة',
    high: 'عالية',
    urgent: 'عاجلة'
  };
  return labels[priority] || priority;
}

function getCategoryLabel(category) {
  const labels = {
    field_work: 'عمل ميداني',
    meeting: 'اجتماع',
    report: 'تقرير',
    survey: 'مسح',
    training: 'تدريب',
    other: 'أخرى'
  };
  return labels[category] || category;
}