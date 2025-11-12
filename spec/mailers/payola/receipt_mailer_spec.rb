require 'spec_helper'

module Payola
  describe ReceiptMailer do
    let(:sale) { create(:sale) }

    before do
      Payola.pdf_receipt = false
    end

    describe '#receipt' do
      it 'should send a receipt' do
        mail = Payola::ReceiptMailer.receipt(sale.guid)
        expect(mail.subject).to eq 'Purchase Receipt'
      end

      it 'should send a receipt with a pdf' do
        Payola.pdf_receipt = true

        # Mock the Docverter module and class since docverter gem is optional
        docverter_module = Module.new
        docverter_conversion = Class.new do
          def self.run
            yield self.new
            'pdf'
          end
          def from=(_); end
          def to=(_); end
          def content=(_); end
        end
        stub_const('Docverter', docverter_module)
        stub_const('Docverter::Conversion', docverter_conversion)

        # Stub the require call since we've already defined the constants
        allow_any_instance_of(Payola::ReceiptMailer).to receive(:require).with('docverter').and_return(true)

        mail = Payola::ReceiptMailer.receipt(sale.guid)
        expect(mail.attachments["receipt-#{sale.guid}.pdf"]).to_not be nil
      end

      it "should allow product to override subject" do
        expect_any_instance_of(Product).to receive(:receipt_subject).and_return("Override Subject")
        mail = Payola::ReceiptMailer.receipt(sale.guid)
        expect(mail.subject).to eq 'Override Subject'
      end

      it "should allow product to override from address" do
        expect_any_instance_of(Product).to receive(:receipt_from_address).and_return("Override <override@example.com>")
        mail = Payola::ReceiptMailer.receipt(sale.guid)
        expect(mail.from.first).to eq 'override@example.com'
      end
    end

    describe '#refund' do
      it "should send refund email" do
        mail = Payola::ReceiptMailer.refund(sale.guid)
        expect(mail.subject).to eq 'Refund Confirmation'
      end

      it "should allow product to override subject" do
        expect_any_instance_of(Product).to receive(:refund_subject).and_return("Override Subject")
        mail = Payola::ReceiptMailer.refund(sale.guid)
        expect(mail.subject).to eq 'Override Subject'
      end

      it "should allow product to override from address" do
        expect_any_instance_of(Product).to receive(:refund_from_address).and_return("Override <override@example.com>")
        mail = Payola::ReceiptMailer.refund(sale.guid)
        expect(mail.from.first).to eq 'override@example.com'
      end
    end
  end
end
