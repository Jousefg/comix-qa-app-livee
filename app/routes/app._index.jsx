import { useLoaderData, useSubmit, useNavigation, useActionData } from "react-router";
import { 
  Page, Layout, Card, Text, TextField, Button, BlockStack, 
  Banner, Box, InlineStack, Badge, Divider, Tabs, Modal, 
  EmptyState, Icon, Link 
} from "@shopify/polaris";
// İkonları Polaris'in içinden alıyoruz (EmailIcon eklendi)
import { 
  PersonIcon, ChatIcon, DeleteIcon, EditIcon, 
  CheckCircleIcon, AlertCircleIcon, StoreIcon, EmailIcon 
} from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import db from "../db.server";
import { authenticate } from "../shopify.server";

// --- LOADER ---
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  const pending = await db.question.findMany({ where: { status: "PENDING" }, orderBy: { createdAt: "desc" } });
  const published = await db.question.findMany({ where: { status: "PUBLISHED" }, orderBy: { createdAt: "desc" } });
  
  return { 
    pendingQuestions: pending,
    publishedQuestions: published,
    stats: { pending: pending.length, published: published.length, total: pending.length + published.length }
  };
};

// --- ACTION ---
export const action = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType");
  const id = Number(formData.get("id"));
  const productId = formData.get("productId");
  const globalProductId = `gid://shopify/Product/${productId}`;

  try {
    if (actionType === "delete") {
      await db.question.delete({ where: { id } });
      return { success: "Soru başarıyla silindi." };
    }

    const answer = actionType === "edit" ? formData.get("newAnswer") : formData.get("answer");
    if (!answer) return { error: "Yanıt boş olamaz." };

    await db.question.update({
      where: { id },
      data: { answer, status: "PUBLISHED" }
    });

    // Metafield Güncelleme
    const metafieldData = JSON.stringify({
      question: formData.get("question"),
      answer: answer,
      customer: formData.get("customer"),
      date: new Date().toISOString()
    });

    await admin.graphql(
      `#graphql
      mutation CreateMetafield($metafield: MetafieldsSetInput!) {
        metafieldsSet(metafields: [$metafield]) {
          metafields { id }
          userErrors { field message }
        }
      }`,
      {
        variables: {
          metafield: {
            ownerId: globalProductId,
            namespace: "custom_qna",
            key: "latest_qna",
            type: "json",
            value: metafieldData
          }
        }
      }
    );

    return { success: "İşlem başarıyla tamamlandı." };

  } catch (error) {
    return { error: "Hata: " + error.message };
  }
};

// --- UI ---
export default function Index() {
  const { pendingQuestions, publishedQuestions, stats } = useLoaderData();
  const actionData = useActionData();
  const submit = useSubmit();
  const nav = useNavigation();
  const isSubmitting = nav.state === "submitting";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [selectedTab, setSelectedTab] = useState(0);
  const [answers, setAnswers] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editAnswer, setEditAnswer] = useState("");
  const [deleteModal, setDeleteModal] = useState(null); // Silinecek ID'yi tutar

  if (!mounted) return null;

  const tabs = [
    { id: 'pending', content: `Bekleyenler (${stats.pending})`, panelID: 'pending-panel' },
    { id: 'published', content: `Yayınlananlar (${stats.published})`, panelID: 'published-panel' }
  ];

  const activeQuestions = selectedTab === 0 ? pendingQuestions : publishedQuestions;

  return (
    <Page title="Soru & Cevap Yönetimi" subtitle="Müşteri sorularını yönetin." fullWidth>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {actionData?.error && <Banner tone="critical" title="Hata">{actionData.error}</Banner>}
            {actionData?.success && <Banner tone="success" title="Başarılı">{actionData.success}</Banner>}

            <Card padding="0">
              <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                <Box padding="400">
                  <BlockStack gap="400">
                    {activeQuestions.length === 0 ? (
                      <EmptyState heading="Kayıt Bulunamadı" image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png">
                        <p>Bu kategoride şu an işlem yapılacak soru yok.</p>
                      </EmptyState>
                    ) : (
                      activeQuestions.map((q) => (
                        <Card key={q.id} roundedAbove="sm">
                          <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text variant="headingMd" as="h3">{q.productName || "Ürün Bilgisi Yok"}</Text>
                              <Badge tone={selectedTab === 0 ? "attention" : "success"}>
                                {selectedTab === 0 ? "Onay Bekliyor" : "Yayında"}
                              </Badge>
                            </InlineStack>
                            <Divider />
                            
                            {/* SORU KUTUSU */}
                            <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                              <BlockStack gap="200">
                                
                                {/* Müşteri Bilgisi ve Email Alanı - YENİ */}
                                <InlineStack gap="400" align="start" blockAlign="center">
                                  <InlineStack gap="200">
                                    <Icon source={PersonIcon} tone="subdued" />
                                    <Text fontWeight="bold">{q.customer || "Ziyaretçi"}</Text>
                                  </InlineStack>

                                  {/* Varsa E-maili Göster */}
                                  {q.email && (
                                    <InlineStack gap="100">
                                      <Icon source={EmailIcon} tone="subdued" />
                                      <Link url={`mailto:${q.email}`} removeUnderline monochrome>
                                        <Text variant="bodySm" tone="subdued">{q.email}</Text>
                                      </Link>
                                    </InlineStack>
                                  )}
                                </InlineStack>

                                <Box paddingInlineStart="800">
                                  <Text variant="bodyMd">{q.question}</Text>
                                </Box>
                              </BlockStack>
                            </Box>

                            {/* DÜZENLEME VEYA GÖRÜNTÜLEME */}
                            {editingId === q.id ? (
                              <form method="post" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); setEditingId(null); }}>
                                <input type="hidden" name="actionType" value="edit" />
                                <input type="hidden" name="id" value={q.id} />
                                <input type="hidden" name="productId" value={q.productId} />
                                <input type="hidden" name="question" value={q.question} />
                                <input type="hidden" name="customer" value={q.customer} />
                                <BlockStack gap="200">
                                  <TextField label="Yanıtı Düzenle" name="newAnswer" value={editAnswer} onChange={setEditAnswer} multiline={3} autoComplete="off"/>
                                  <InlineStack align="end" gap="200">
                                    <Button onClick={() => setEditingId(null)}>İptal</Button>
                                    <Button submit variant="primary">Kaydet</Button>
                                  </InlineStack>
                                </BlockStack>
                              </form>
                            ) : (
                              selectedTab === 1 && (
                                <Box background="bg-surface-info-active" padding="400" borderRadius="200">
                                  <BlockStack gap="200">
                                    <InlineStack gap="200">
                                      <Icon source={StoreIcon} tone="info" />
                                      <Text fontWeight="bold" tone="info">Comix Life Yanıtı:</Text>
                                    </InlineStack>
                                    <Box paddingInlineStart="800">
                                      <Text>{q.answer}</Text>
                                    </Box>
                                  </BlockStack>
                                </Box>
                              )
                            )}

                            {/* BUTONLAR */}
                            {editingId !== q.id && (
                              <>
                                {selectedTab === 0 && (
                                  <form method="post" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
                                    <input type="hidden" name="actionType" value="publish" />
                                    <input type="hidden" name="id" value={q.id} />
                                    <input type="hidden" name="productId" value={q.productId} />
                                    <input type="hidden" name="question" value={q.question} />
                                    <input type="hidden" name="customer" value={q.customer} />
                                    <BlockStack gap="200">
                                      <TextField label="Comix Life Yanıtı" name="answer" value={answers[q.id] || ""} onChange={(v) => setAnswers({...answers, [q.id]: v})} multiline={3} autoComplete="off" placeholder="Kurumsal yanıtınızı yazınız..." />
                                      <InlineStack align="end">
                                        <Button submit variant="primary" icon={CheckCircleIcon} loading={isSubmitting}>Yayınla</Button>
                                      </InlineStack>
                                    </BlockStack>
                                  </form>
                                )}
                                {selectedTab === 1 && (
                                  <>
                                    <Divider />
                                    <InlineStack align="end" gap="200">
                                      <Button icon={EditIcon} onClick={() => { setEditingId(q.id); setEditAnswer(q.answer); }}>Düzenle</Button>
                                      <Button icon={DeleteIcon} tone="critical" onClick={() => setDeleteModal(q)}>Sil</Button>
                                    </InlineStack>
                                  </>
                                )}
                              </>
                            )}
                          </BlockStack>
                        </Card>
                      ))
                    )}
                  </BlockStack>
                </Box>
              </Tabs>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>

      {/* SİLME MODALI */}
      <Modal
        open={!!deleteModal}
        onClose={() => setDeleteModal(null)}
        title="Soruyu Sil"
        primaryAction={{
          content: 'Evet, Sil',
          destructive: true,
          onAction: () => {
            const formData = new FormData();
            formData.append("actionType", "delete");
            formData.append("id", deleteModal.id);
            submit(formData, { method: "post" });
            setDeleteModal(null);
          },
        }}
        secondaryActions={[{ content: 'İptal', onAction: () => setDeleteModal(null) }]}
      >
        <Modal.Section>
          <Text>Bu soruyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.</Text>
        </Modal.Section>
      </Modal>
    </Page>
  );
}