import { ProcurementOrder } from '../types';

export const dispatchWhatsApp = (order: ProcurementOrder): void => {
  const phone = order.company?.whatsapp || order.company?.phone || '';
  const cleanPhone = phone.replace(/[^0-9]/g, '');

  const itemsList = (order.items || [])
    .map(i => `• *${i.item?.name || 'Item'}*: ${i.quantity} ${i.item?.uom || 'Pcs'} @ ₹${i.unit_price} = ₹${i.total_price}`)
    .join('\n');

  const messageText = `*COSMOCNERGY SMART PROCUREMENT OS* 🚀
----------------------------------------
📄 *${order.type === 'RFQ' ? 'REQUEST FOR QUOTATION' : 'PURCHASE ORDER'}*
🔢 *Order No:* ${order.order_number}
🏢 *Vendor:* ${order.company?.name}
📅 *Date:* ${new Date(order.created_at).toLocaleDateString('en-IN')}

📦 *ITEMS ORDERED:*
${itemsList}

💰 *TOTAL AMOUNT:* ₹${Number(order.total_amount).toLocaleString('en-IN')}
----------------------------------------
📝 *Notes:* ${order.notes || 'Please confirm order receipt & dispatch schedule.'}

_Generated automatically via CosmoCnergy Procurement OS._`;

  const encodedText = encodeURIComponent(messageText);
  const whatsappUrl = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}` 
    : `https://wa.me/?text=${encodedText}`;

  window.open(whatsappUrl, '_blank');
};

export const dispatchEmail = async (order: ProcurementOrder): Promise<{ success: boolean; message: string }> => {
  const companyName = import.meta.env.VITE_COMPANY_NAME || 'CosmoCnergy Procurement';
  const subject = `[${order.type}] ${order.order_number} - ${companyName}`;

  const itemsList = (order.items || [])
    .map(i => `- ${i.item?.name || 'Item'}: ${i.quantity} ${i.item?.uom || 'Pcs'} @ ₹${i.unit_price}/unit = ₹${i.total_price}`)
    .join('\n');

  const emailBody = `Dear ${order.company?.contact_person || order.company?.name},\n\nPlease find details for our ${order.type === 'RFQ' ? 'Request for Quotation' : 'Purchase Order'} below:\n\nOrder Number: ${order.order_number}\nDate: ${new Date(order.created_at).toLocaleDateString('en-IN')}\n\nItems:\n${itemsList}\n\nTotal Amount: ₹${Number(order.total_amount).toLocaleString('en-IN')}\n\nNotes:\n${order.notes || 'N/A'}\n\nBest regards,\n${order.created_by}\n${companyName}`;

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: order.company?.email,
        subject,
        text: emailBody,
        order
      })
    });

    if (res.ok) {
      return { success: true, message: 'Serverless background email sent successfully!' };
    }
  } catch (e) {
    console.warn('Vercel serverless email endpoint offline, using browser mailto link fallback:', e);
  }

  // Fallback to mailto link
  const mailtoUrl = `mailto:${order.company?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailBody)}`;
  window.open(mailtoUrl, '_blank');

  return { success: true, message: 'Opened direct email draft for sending!' };
};
